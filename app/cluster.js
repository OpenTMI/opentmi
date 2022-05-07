const cluster = require('cluster');
const Worker = require('./worker');
const Master = require('./master');

if (cluster.isMaster) {
  process.once('SIGINT', Master.handleSIGINT);
  process.once('exit', Master.logMasterDeath);
  Master.onExit = (code) => process.exit(code);
  Master.initialize();
} else {
  Worker();
}
