# OpenTMI
Open Source Test Management Infrastructure for IoT and embedded world.

 [![Build Status][build-image]][build-url]
 [![Test Coverage][coveralls-image]][coveralls-url]
 [![Docker][docker-image]][docker-url]
 [![ghcr][ghcr-image]][ghcr-url]

OpenTMI is Open Source Test Management System. It is written in [Node.js][Node.js] / 
Javascript and uses [MongoDB][MongoDB] as backing store. It is published in [MIT license](LICENSE.md).
OpenTMI is extremely customizable through [addons](doc/addons.md).


# Ideology

Basic idea is to store **all** information related to test execution to database, like software under test (SUT/Build), test logs, test cases (TC), and test related resources, like DUT's. That allows then much more intelligent and more efficient way to manage testing. Also it gives very valuable information when users can directly see what is tested in individual Device with individual Build. All information is linked together and can be analyzed very deeply.

## Challenges with software testing in IoT hardware
* how to identify when test failed because of unstable HW
* how to identify unique unstable HW in test lab
* how to identify if certain test causes that HW's become unstable/unusable
* how to estimate when HW start to be unstable/unusable (e.g. memory start burning out)
* how to direct testing to right HW when there is multiple HW configurations
* how to identify if tools deployment (e.g. new test framework revision) causes more test failures
* how to optimize test execution time
* how to manage all of these automatically

OpenTMI try to solve these kind of challenges using "big-data".

# Pre-requirements

* [Node.js][Node.js] v12.13< (tested with 12, 14 and 16, recommended to use latest LTS version)
* [mongodb][MongoDB] v3.6< (tested with 4.1.2, recommented to use latest version)

# Installation

## From Dockers

```
docker pull opentmi/opentmi:latest mongo:latest
docker run -v "$(pwd)":/data --name mongo -d mongo mongod --smallfiles
docker run --name opentmi -p 3000:3000 --link mongo:mongo -d opentmi/opentmi
```

See [here](doc/docker.md) for more instructions.

## Clone, install dependencies and start

### Prepare

You need to install [mongodb][MongoDB] and run it. File `mongod.sh` contains simple script to start single
mongod instance (db location ./db and logs ./db.logs) - that is not recommended for production usage.

```
> git clone --recursive https://github.com/OpenTMI/opentmi
> cd opentmi
> npm install
> npm start

or start without clustered mode

> node app
```

**Note:** Installation install also all addons dependencies so you doesn't need to worry about it.

# Command line

```
$ npm start -- -h
Usage: npm start -- (options)

Options:
  --listen, -l            set binding interface                         [string]
  --https                 use https
  --port                  set listen port
  --verbose, -v           verbose level                                  [count]
  --silent, -s            Silent mode
  --log                   log path. Use "null" or "/dev/null" to supress file
                          logging                                       [string]
  --autoInstallAddonDeps  automatically install dependencies when startup server
                                                                 [default: true]
  --config, -c            config file          [string] [default: "config.json"]
  --db                    mongodb connection string                     [string]
  --auto-reload, -r       Automatically restart workers when changes detected in
                          server directory
```

**db:**
* `inmemory` as connection string uses in-memory mongodb server - for testing purpose.

**https:**
Generate self-signed ssl certifications:
* `./scripts/gencerts.sh`
* start daemon with `--https` -options (`npm start -- -https`)

**NOTE:** Not recommended to use self-signed certificates in production usage!

## Clustered mode

OpenTMI support [clustered mode](doc/cluster.md) which gives some benefits in production environment:
* better performance
* zero downtime when updating
* auto restart on failure
* serve more clients
* better performance

**NOTE** same can be achieved using load-balancer and systemd service for example.
In such case you doesn't need to use cluster mode.

## API documentation
Available [here](doc/APIs)

## Configuration

By default opentmi is started as development mode. You can configure environment using [`--config <file>`](`config.example.json`) -option.

**note**:
* `"mongo"` options overwrites defaults and is pypassed to [MongoClient](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html).
* `"smtp"` options is pypassed to [nodemailer](https://nodemailer.com/smtp/) transport configurations. To activate smpt use `enabled` property.

# Architecture

* **Backend** (this repository)
    which provide [RESTFull json and websockets (through socketIO) -API](doc/APIs), internal [load balancer](doc/cluster.md) and auto restart on failure etc....
* **Frontends**
  * [default web GUI as addon](https://github.com/opentmi/opentmi-default-gui)
  * [admin gui as addon](https://github.com/opentmi/opentmi-adminui)
* **Client libraries/tools**
  * [opentmi-pyclient](https://github.com/opentmi/opentmi-pyclient)
  * [opentmi-jsclient](https://github.com/opentmi/opentmi-jsclient) for nodejs / browser
  * [opentmi-cli](https://github.com/opentmi/opentmi-cli)
  * [pytest-opentmi](https://github.com/opentmi/pytest-opentmi)

### Addons
Way to extend backend-service functionality. Addon registry (future plan) contains information
about existing addons, which can easily to install via administrator API.
More documentation can be found from [here](doc/addons.md)

### Test

`npm test`

### Contribution guidelines

* Writing tests
* Code review
* Other guidelines

See [code-of-conduct](CODE_OF_CONDUCT.md)

### Production usage

Propose to use some service management tool which can restart service if it for some reason crashes.

You can use for example:
* [supervisor](https://github.com/petruisfan/node-supervisor)

    `supervisor -wa . -n exit server.js`

* [pm2](https://github.com/Unitech/pm2)

    `pm2 start --name opentmi index.js -- -vvv`

* linux [systemd](https://www.freedesktop.org/wiki/Software/systemd/)

    see [example](scripts/opentmi.service) service script

 **Note:** if your service management is storing `stdout` and `stderr` to log
 files - be sure that it is rotated properly to ensure that disk space doesn't
 cause trouble. By default OpenTMI store logs under `log/` -folder, configured as
 daily rotate.

### Who do I talk to?

* Repo owner or admin
* Other community or team contact

## License

  [MIT](LICENSE.md)

<!-- references -->
[Node.js]: https://nodejs.com
[MongoDB]: https://mongodb.com

[build-image]: https://github.com/OpenTMI/opentmi/actions/workflows/push.yml/badge.svg?branch=master&event=push
[build-url]: https://github.com/OpenTMI/opentmi/actions/workflows/push.yml
[coveralls-image]: https://coveralls.io/repos/OpenTMI/opentmi/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/OpenTMI/opentmi?branch=master
[docker-image]: https://img.shields.io/docker/cloud/build/opentmi/opentmi?label=Docker&style=flat
[docker-url]: https://hub.docker.com/r/opentmi/opentmi/builds
[ghcr-image]: https://img.shields.io/badge/ghcr-image-green
[ghcr-url]: https://github.com/OpenTMI/opentmi/pkgs/container/opentmi

