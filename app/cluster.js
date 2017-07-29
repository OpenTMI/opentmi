const cluster = require('cluster');
const Worker = require('./worker');
const Master = require('./master');

if (cluster.isMaster) {
  Master();
} else {
  Worker();
}
