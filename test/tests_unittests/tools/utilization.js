const {expect} = require('chai');

const {
  calcStatistics,
  calcUtilization,
  spreadDays
} = require('../../../app/tools/utilization');

describe('tools/utilization.js', function () {

  // Run this before tests
  describe('statistics', function () {
    it('allocations', function () {
      const events = [
        {cre: {date: new Date('1995-12-17T00:00:00')}, msgid: 'ALLOCATED'},
        {cre: {date: new Date('1995-12-17T00:00:01')}, msgid: 'RELEASED'},
        {cre: {date: new Date('1995-12-18T00:00:00')}, msgid: 'ALLOCATED'},
        {cre: {date: new Date('1995-12-18T00:00:02')}, msgid: 'RELEASED'},
      ];
      return calcStatistics(events)
        .then((stats) => {
          expect(stats.summary.allocations.count).to.be.equal(2);
          expect(stats.summary.allocations.time).to.be.equal(3);
          expect(stats.dates['1995-12-17'].allocations.count).to.be.equal(1);
          expect(stats.dates['1995-12-17'].allocations.time).to.be.equal(1);
          expect(stats.dates['1995-12-18'].allocations.count).to.be.equal(1);
          expect(stats.dates['1995-12-18'].allocations.time).to.be.equal(2);
        });
    });
    it('allocations middle', function () {
      const events = [
        {cre: {date: new Date('1995-12-17T00:00:01')}, msgid: 'RELEASED'},
        {cre: {date: new Date('1995-12-18T00:00:00')}, msgid: 'ALLOCATED'},
        {cre: {date: new Date('1995-12-18T00:00:02')}, msgid: 'RELEASED'},
      ];
      return calcStatistics(events)
        .then((stats) => {
          expect(stats.summary.allocations.count).to.be.equal(1);
          expect(stats.summary.allocations.time).to.be.equal(2);
          expect(stats.dates['1995-12-17'].allocations.count).to.be.equal(0);
          expect(stats.dates['1995-12-17'].allocations.time).to.be.equal(0);
          expect(stats.dates['1995-12-18'].allocations.count).to.be.equal(1);
          expect(stats.dates['1995-12-18'].allocations.time).to.be.equal(2);
        });
    });
    it('maintenances', function () {
      const events = [
        {cre: {date: new Date('1995-12-17T00:00:00')}, msgid: 'ENTER_MAINTENANCE'},
        {cre: {date: new Date('1995-12-17T00:00:01')}, msgid: 'EXIT_MAINTENANCE'},
        {cre: {date: new Date('1995-12-18T00:00:00')}, msgid: 'ENTER_MAINTENANCE'},
        {cre: {date: new Date('1995-12-18T00:00:02')}, msgid: 'EXIT_MAINTENANCE'},
      ];
      return calcStatistics(events)
        .then((stats) => {
          expect(stats.summary.maintenance.count).to.be.equal(2);
          expect(stats.summary.maintenance.time).to.be.equal(3);
          expect(stats.dates['1995-12-17'].maintenance.count).to.be.equal(1);
          expect(stats.dates['1995-12-17'].maintenance.time).to.be.equal(1);
          expect(stats.dates['1995-12-18'].maintenance.count).to.be.equal(1);
          expect(stats.dates['1995-12-18'].maintenance.time).to.be.equal(2);
        });
    });
    it('flashes', function () {
      const events = [
        {cre: {date: new Date('1995-12-17T00:00:00')}, msgid: 'FLASHED'},
        {cre: {date: new Date('1995-12-18T00:00:00')}, msgid: 'FLASHED', priority: {level: 'err'}}
      ];
      return calcStatistics(events)
        .then((stats) => {
          expect(stats.summary.flashed.count).to.be.equal(2);
          expect(stats.dates['1995-12-17'].flashed.count).to.be.equal(1);
          expect(stats.dates['1995-12-18'].flashed.count).to.be.equal(1);
          expect(stats.dates['1995-12-18'].flashed.failCount).to.be.equal(1);
        });
    });
  });
  describe('utilization', function () {
    it('usage utilization', function () {
      const events = [
        {cre: {date: new Date('1995-12-17T00:00:00')}, msgid: 'ALLOCATED'},
        {cre: {date: new Date('1995-12-17T23:00:00')}, msgid: 'RELEASED'},
        {cre: {date: new Date('1995-12-18T00:00:00')}, msgid: 'FLASHED'}
      ];
      return calcUtilization(events)
        .then((stats) => {
          const utilization = 96;
          expect(Math.round(stats.summary.allocations.utilization)).to.be.equal(utilization);
          expect(Math.round(stats.dates['1995-12-17'].allocations.utilization)).to.be.equal(utilization);
        });
    });
  });
});
