// Native modules
const fs = require('fs');
const path = require('path');

// Application modules
const NpmUpdater = require('./npmUpdater');
const GitUpdater = require('./gitUpdater');

if (fs.existsSync(path.join(__dirname, '..', '..', '..', '.git'))) {
  module.exports = GitUpdater;
} else {
  module.exports = NpmUpdater;
}
