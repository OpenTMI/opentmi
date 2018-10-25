const cluster = require('cluster');
const Worker = require('./worker');
const Master = require('./master');

if (cluster.isMaster) {
  Master.onExit = code => process.exit(code);
  Master.initialize();
} else {
  Worker();
}
