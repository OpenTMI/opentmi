const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');

const toSeconds = milliseconds => milliseconds/1000;


const calcStatistics = (data) => {
  /**
   * Calculate statistics from events array
   * - could be done even in DB side
   * - total allocations count & duration
   * - total flashed count & failCount (priority.level=err)
   * - total maintenance count & duration
   * - msgid: 'ALLOCATED', RELEASED', 'FLASHED', 'ENTER_MAINTENANCE', 'EXIT_MAINTENANCE'
   *
   * @param {List<Event>} data list of events objects
   * @return {Object}
   * {{allocations: {count: number, time: number},
   * maintenance: {count: number, time: number},
   * flashed: {count: number, failCount: number}}}
   */
  const initer = () => ({
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

  const startTimes = {};
  const reducer = (accumulator, event) => {
    const date = _.get(event, 'cre.date');
    const dateStr = moment(date).utc().format('YYYY-MM-DD');
    if (!_.has(accumulator.dates, dateStr)) {
      accumulator.dates[dateStr] = initer();
    }
    if (event.msgid === 'ALLOCATED') {
      startTimes[event.msgid] = date;
      accumulator.summary.allocations.count += 1;
      accumulator.dates[dateStr].allocations.count += 1;
    } else if (event.msgid === 'RELEASED' && startTimes['ALLOCATED']) {
      const startTime = startTimes['ALLOCATED'];
      const duration = toSeconds(date - startTime);
      accumulator.summary.allocations.time += duration;
      accumulator.dates[dateStr].allocations.time += duration;
    } else if (event.msgid === 'ENTER_MAINTENANCE') {
      startTimes[event.msgid] = date;
      accumulator.summary.maintenance.count += 1;
      accumulator.dates[dateStr].maintenance.count += 1;
    } else if (event.msgid === 'EXIT_MAINTENANCE' && startTimes['ENTER_MAINTENANCE']) {
      const startTime = startTimes['ENTER_MAINTENANCE'];
      const duration = toSeconds(date - startTime);
      accumulator.summary.maintenance.time += duration;
      accumulator.dates[dateStr].maintenance.time += duration;
    } else if (event.msgid === 'FLASHED') {
      accumulator.summary.flashed.count += 1;
      accumulator.dates[dateStr].flashed.count += 1;
      if (_.get(event, 'priority.level') === 'err') {
        accumulator.summary.flashed.failCount += 1;
        accumulator.dates[dateStr].flashed.failCount += 1;
      }
    }
    return new Promise(resolve => process.nextTick(resolve, accumulator));
  };
  const initialValue = {
    count: data.length,
    summary: initer(),
    dates: {}
  };
  return Promise.reduce(data, reducer, initialValue);
};


// @todo calculcate resource utilization - could be done even in DB side:
// how many seconds per day device has been allocated
// -> based on that information we can calculate percentual values
const calcUtilization = (data) => {
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
  spreadDays,
  calcStatistics,
  calcUtilization
};
