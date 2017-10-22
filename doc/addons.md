## Usage

Addons have restricted access to internal openTMI features but it can be use
to extend web API's or socketIO messaging. Global event bus is also possible
to use to listen e.g. events when new result is arrived.

## example

```
const express = require('express');
const logger = require('../../tools/logger');
class AddonCore {
  constructor(app, server, io) {
    // Defined variables
    this.router = express.Router();
    this.staticPath = { prefix: '/test', folder: '/public/' };
  }

  // Default implementation of register
  register() {
    logger.warn('registering instance of sample class');
    this.router.get('/test', (req, res) => res.json({ ok: 1 }));
  }
  unregister() {
    logger.warn('unregistering instance of sample class');
  }
}
module.exports = AddonCore;
```
More extended version is available [here](../app/addons/sample).

## Available Addons

There is available several example addons available:
* [default-gui](https://github.com/opentmi/opentmi-default-gui) (first web-ui revision)
* [github](https://github.com/opentmi/opentmi-github) (github-repository integraiton)
* [Jenkins](https://github.com/opentmi/opentmi-jenkins) (jenkins-integration)
* [Slack](https://github.com/opentmi/opentmi-slack) (Slack messaging integration)
* [sample](../app/addons/sample) (just for example)
