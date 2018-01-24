// 3rd party modules
const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');


// application modules
const logger = require('./logger');
const {MsgIds, Priorities} = require('../models/event');

const toSeconds = milliseconds => milliseconds / 1000;
// const DAY_IN_SECONDS = 60 * 60 * 24;

const increase = (obj, path, count = 1) => {
  const newValue = _.get(obj, path) + count;
  _.set(obj, path, newValue);
};
/*
const decrease = (obj, path, count = 1) => {
  const newValue = _.get(obj, path) - count;
  _.set(obj, path, newValue);
};
*/
const roundDate = date => moment(date).utc().format('YYYY-MM-DD');


class Utilization {
  constructor() {
    this._starts = {};
    this._accumulator = {
      count: 0,
      summary: Utilization.newSummary(),
      dates: {}
    };
  }

  static newSummary() {
    return {
      allocations: {
        count: 0,
        time: 0
      },
      maintenance: {
        count: 0,
        time: 0
      },
      flashed: {
        count: 0,
        failCount: 0
      }
    };
  }

  get summary() {
    return this._accumulator;
  }
  push(event) {
    /**
     * Calculate statistics from events array
     * - could be done even in DB side
     * - total allocations count & duration
     * - total flashed count & failCount (priority.level=err)
     * - total maintenance count & duration
     * - msgid: 'ALLOCATED', RELEASED', 'FLASHED', 'ENTER_MAINTENANCE', 'EXIT_MAINTENANCE'
     *
     * @todo this doesn't handle day-over durations
     * e.g. allocated 23:00, release 01:00.
     * @param {List<Event>} data list of events objects
     * @return {Object} resolves {Object}
     * {{allocations: {count: number, time: number},
     * maintenance: {count: number, time: number},
     * flashed: {count: number, failCount: number}}}
     */
    this._accumulator.count += 1;
    if (!this.first) {
      this.first = event;
    } else {
      this.last = event;
    }
    const date = _.get(event, 'cre.date');
    const id = _.get(event, 'id');
    const dateStr = roundDate(date);
    if (!_.has(this._accumulator.dates, dateStr)) {
      _.set(this._accumulator, `dates.${dateStr}`, Utilization.newSummary());
    }
    if (event.msgid === MsgIds.ALLOCATED) {
      this._starts[event.msgid] = {date, id};
      increase(this._accumulator, 'summary.allocations.count');
      increase(this._accumulator, `dates.${dateStr}.allocations.count`);
    } else if (event.msgid === MsgIds.RELEASED && this._starts[MsgIds.ALLOCATED]) {
      const startTime = this._starts[MsgIds.ALLOCATED].date;
      const startId = this._starts[MsgIds.ALLOCATED].id;
      if (startTime > date) {
        logger.warn('time axis is not constand');
      } else if (startId === id) {
        const startTimeStr = roundDate(startTime);
        const duration = toSeconds(date - startTime);
        increase(this._accumulator, 'summary.allocations.time', duration);
        increase(this._accumulator, `dates.${startTimeStr}.allocations.time`, duration);
      } else {
        logger.warn('released event without corresponding allocated event');
      }
    } else if (event.msgid === MsgIds.ENTER_MAINTENANCE) {
      this._starts[event.msgid] = {date, id};
      increase(this._accumulator, 'summary.maintenance.count');
      increase(this._accumulator, `dates.${dateStr}.maintenance.count`);
    } else if (event.msgid === MsgIds.EXIT_MAINTENANCE && this._starts[MsgIds.ENTER_MAINTENANCE]) {
      const startTime = this._starts[MsgIds.ENTER_MAINTENANCE].date;
      const startId = this._starts[MsgIds.ENTER_MAINTENANCE].id;
      if (startId === id) {
        const startTimeStr = roundDate(startTime);
        const duration = toSeconds(date - startTime);
        increase(this._accumulator, 'summary.maintenance.time', duration);
        increase(this._accumulator, `dates.${startTimeStr}.maintenance.time`, duration);
      } else {
        logger.warn('exit_maintenance event without corresponding enter_maintenance event');
      }
    } else if (event.msgid === MsgIds.FLASHED) {
      increase(this._accumulator, 'summary.flashed.count');
      increase(this._accumulator, `dates.${dateStr}.flashed.count`);
      if (_.get(event, 'priority.level') === Priorities.ERR) {
        increase(this._accumulator, 'summary.flashed.failCount');
        increase(this._accumulator, `dates.${dateStr}.flashed.failCount`);
      }
    }
    return new Promise(resolve => process.nextTick(resolve, this));
  }

  calculate() {
    /**
     * calculcate resource utilization
     * (could be done even in DB side)
     * how many seconds per day device has been allocated - been in maintenance
     * based on that information this calculate percentual values
     * @param {List<Event>} data
     * @return {Object}
     */
    let duration = 0;
    if (this._accumulator.count >= 2) {
      duration = toSeconds(this.last.cre.date - this.first.cre.date);
    } else {
      return Promise.reject(new Error('There is no enough events for selected period'));
    }
    // calculate utilizations
    let utilization = (this._accumulator.summary.allocations.time / duration) * 100;
    this._accumulator.summary.allocations.utilization = utilization;
    utilization = (this.summary.summary.maintenance.time / duration) * 100;
    this._accumulator.summary.maintenance.utilization = utilization;
    // calculate day based utilizations..
    const reducer = (accumulator, date) => {
      const obj = this._accumulator.dates[date];
      utilization = (obj.allocations.time / duration) * 100;
      obj.allocations.utilization = utilization;
      utilization = (obj.maintenance.time / duration) * 100;
      obj.maintenance.utilization = utilization;
      return new Promise(resolve => process.nextTick(resolve, accumulator));
    };
    return Promise.reduce(Object.keys(this._accumulator.dates), reducer, this._accumulator);
  }
  /*
  static spreadDates(summary) {
    const reds = (accumulator, dateStr, index) => {
      const MAX_DAYS = 5;
      let i = 0;
      while (i < MAX_DAYS) {
        i += 1;
        const duration = _.get(summary.dates, `${dateStr}.allocations.time`);
        if (duration > DAY_IN_SECONDS) {
          const newEvent = newEvevent();
          _.set(summary.dates, `${dateStr}.allocations.time`, DAY_IN_SECONDS);
          accumulator.dates.push(newEvent);
          decrease(summary.dates, `${dateStr}.allocations.time`, DAY_IN_SECONDS);
        }
      }
      return accumulator;
    };
    return Promise.reduce(Object.keys(summary.dates), reds, summary);
  }
  */
  static calcStatistics(data) {
    const utilization = new Utilization();
    return Promise.each(data, utilization.push.bind(utilization))
      .then(() => utilization.summary);
  }
  static calcUtilization(data) {
    const utilization = new Utilization();
    return Promise.each(data, utilization.push.bind(utilization))
      .then(() => utilization.calculate());
  }
}

module.exports = {
  Utilization,
  calcStatistics: Utilization.calcStatistics,
  calcUtilization: Utilization.calcUtilization
};
