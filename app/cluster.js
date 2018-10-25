const cluster = require('cluster');
const Worker = require('./worker');
const Master = require('./master');

if (cluster.isMaster) {
  Master.onExit = code => process.exit(code);
  process.on('SIGINT', Master.handleSIGINT);
  process.on('exit', Master.logMasterDeath);
  Master.initialize();
} else {
  Worker();
}
