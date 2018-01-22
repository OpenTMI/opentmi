// 3rd party modules
const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');


// application modules
const logger = require('./logger');

const {MsgIds, Priorities} = require('../models/event');

const toSeconds = milliseconds => milliseconds/1000;
const DAY_IN_SECONDS = 60*60*24;

const increase = (obj, path, count = 1) => {
  const newValue = _.get(obj, path) + count;
  _.set(obj, path, newValue);
};
const decrease = (obj, path, count = 1) => {
  const newValue = _.get(obj, path) - count;
  _.set(obj, path, newValue);
};
const roundDate = date => moment(date).utc().format('YYYY-MM-DD');

const newEvevent = () => ({
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
  });

const spreadDates = (summary) => {
  const reds = (accumulator, dateStr, index) => {
    const MAX_DAYS = 5;
    let i=0;
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
};

const calcStatistics = (data) => {
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
   * @return {Object}
   * {{allocations: {count: number, time: number},
   * maintenance: {count: number, time: number},
   * flashed: {count: number, failCount: number}}}
   */

  const starts = {};
  const reducer = (accumulator, event) => {
    const date = _.get(event, 'cre.date');
    const id = _.get(event, 'id');
    const dateStr = roundDate(date);
    if (!_.has(accumulator.dates, dateStr)) {
      _.set(accumulator, `dates.${dateStr}`, newEvevent());
    }
    if (event.msgid === MsgIds.ALLOCATED) {
      starts[event.msgid] = {date, id};
      increase(accumulator, 'summary.allocations.count');
      increase(accumulator, `dates.${dateStr}.allocations.count`);
    } else if (event.msgid === MsgIds.RELEASED && starts[MsgIds.ALLOCATED]) {
      const startTime = starts[MsgIds.ALLOCATED].date;
      const startId = starts[MsgIds.ALLOCATED].id;
      if (startId === id) {
        const startTimeStr = roundDate(startTime);
        const duration = toSeconds(date - startTime);
        increase(accumulator, 'summary.allocations.time', duration);
        increase(accumulator, `dates.${startTimeStr}.allocations.time`, duration);
      } else {
        logger.warn('released event without corresponding allocated event');
      }
    } else if (event.msgid === MsgIds.ENTER_MAINTENANCE) {
      starts[event.msgid] = {date, id};
      increase(accumulator, 'summary.maintenance.count');
      increase(accumulator, `dates.${dateStr}.maintenance.count`);
    } else if (event.msgid === MsgIds.EXIT_MAINTENANCE && starts[MsgIds.ENTER_MAINTENANCE]) {
      const startTime = starts[MsgIds.ENTER_MAINTENANCE].date;
      const startId = starts[MsgIds.ENTER_MAINTENANCE].id;
      if (startId === id) {
        const startTimeStr = roundDate(startTime);
        const duration = toSeconds(date - startTime);
        increase(accumulator, 'summary.maintenance.time', duration);
        increase(accumulator, `dates.${startTimeStr}.maintenance.time`, duration);
      } else {
        logger.warn('exit_maintenance event without corresponding enter_maintenance event')
      }
    } else if (event.msgid === MsgIds.FLASHED) {
      increase(accumulator, 'summary.flashed.count');
      increase(accumulator, `dates.${dateStr}.flashed.count`);
      if (_.get(event, 'priority.level') === Priorities.ERR) {
        increase(accumulator, 'summary.flashed.failCount');
        increase(accumulator, `dates.${dateStr}.flashed.failCount`);
      }
    }
    return new Promise(resolve => process.nextTick(resolve, accumulator));
  };
  const initialValue = {
    count: data.length,
    summary: newEvevent(),
    dates: {}
  };
  return Promise.reduce(data, reducer, initialValue)
    //.then(spreadDates);
};

const calcUtilization = (data) => {
  /**
   * calculcate resource utilization
   * (could be done even in DB side)
   * how many seconds per day device has been allocated - been in maintenance
   * based on that information this calculate percentual values
   * @param {List<Event>} data
   * @return {Object}
   */
  let duration = 0;
  if (data.length >= 2) {
    duration = toSeconds(data[data.length-1].cre.date - data[0].cre.date);
  } else {
    return Promise.reject(new Error('There is no enough events for selected period'));
  }
  return calcStatistics(data)
    .then((results) => {
      const stats = results;
      // calculate utilizations
      let utilization = (stats.summary.allocations.time / duration) * 100;
      stats.summary.allocations.utilization = utilization;
      utilization = (stats.summary.maintenance.time / duration) * 100;
      stats.summary.maintenance.utilization = utilization;
      // calculate day based utilizations..
      const reducer = (accumulator, date) => {
        const obj = stats.dates[date];
        utilization = (obj.allocations.time / duration) * 100;
        obj.allocations.utilization = utilization;
        utilization = (obj.maintenance.time / duration) * 100;
        obj.maintenance.utilization = utilization;
        return new Promise(resolve => process.nextTick(resolve, accumulator));
      };
      return Promise.reduce(Object.keys(stats.dates), reducer, stats);
    });
};

module.exports = {
  calcStatistics,
  calcUtilization
};
