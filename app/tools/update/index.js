// native modules
const fs = require('fs');
// application modules
const NpmUpdater = require('./npmUpdater');
const GitUpdater = require('./gitUpdater');

if (fs.existsSync('../../../.git')) {
  module.exports = GitUpdater;
} else {
  module.exports = NpmUpdater;
}
