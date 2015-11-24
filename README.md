# OpenTMI - Open Source Test Management Infrastructure
 
 [![Build Status][build-image]][build-url]
 [![Test Coverage][coveralls-image]][coveralls-url]

OpenTMI is Open Source Test Management System. It is written in Node.js / Javascript and uses MongoDB as backing store. It is published in GPLv3 license.

![screenshot](doc/screenshot.jpg)

OpenTMI is extremely customizable through plugins. 

# Ideology

Basic idea is to store **all** meta information related to test execution, like software under test (Build), test cases (TC), and test related resources, like DUT's to database which allows then much more intelligent and more efficient way to manage testing. Also it gives very valuable information when we can directly see what is tested in individual Device with individual Build...

# Installation

## Prepare

You need to install mongodb and run it. File `mongod.sh` contains simple script to start mongod instance (db location ./db and logs ./db.logs).

## Clone, install dependencies and start

```
git clone --recursive https://github.com/OpenTMI/opentmi
cd opentmi
npm install
npm start
or
node .
```

## Available Plugins:

[See from registry](https://github.com/OpenTMI/opentmi-registry)

## Configuration

By default it start as development mode so configure file is:
`./config/env/development`
example..
```
module.exports = {
  name: 'OpenTMI',
  host: '127.0.0.1',
  port: 3000,
  db: 'mongodb://localhost/tmi_dev',
  admin: {
    //default values
    'user': 'admin',
    'pwd': 'admin',
  },
  ldap: {
    url: process.env.LDAP_URL
  },
  ...
}
```

# Architecture

* Backend
 * which provide RESTFull json -API, authentication etc.
   Backend functionality can be extended with addons. This allows to use business -related secret stuff for example..
* Frontend
 * OpenTMI provide default web GUI, which is single addon in backend actually.
    webGUI is written with angularJS.
* Client libraries
 * opentmi-client-python provide easy python API for test scripts, so that this system is easy to start using.

## What is this repository for?

This Repository provide backend for OpenTMI.

Service contains full RESTFull json -API, as well as websockets.
Also there will several different kind of backend-services as addons, like scheduler, result-analyser, report-generator, suite-generator, etc...

## Service resources (with API) are
* Accounts
* Groups
* Admin
* Test Cases
* Product features
* Campaigns
* Test Automation
 * Jobs
* Resources
 * DUT's
 * LAB equipments
 * Rooms
* Builds
* Test Results
* Reports
 * Report template's
* Addons

### Accounts ###
(not yet fully implemented)
Accounts provide information and configuration related individual accounts. It also give authentication and access policy. External authentication methods, like github/google/... can be easily to integrate to provide simple and easy login -mechanism.

### Groups ###
(not yet fully implemented)
Groups provide access policy to other API's. Access policy is very similar than linux has, we have users (=Accounts), groups and others.
### admin -API ###
admin API is allowed only admin -users. It provide remote control service configuration. For example, it can be use to install new addons, or control addon configurations. 

### Test Case ###
Test Case provide global registry for Test Case -related informations. Informations are for example TC type, owner, features under test (FUT), components under test (CUT), requirements, specification, etc. It could contains also TC implementation, or at least it should contain detail where implementation can be found (url). Test Case API could be extended also to fetch actual test implementation from GIT for example.

### Product Features ###
Product features give possibility to create feature-tree and manage features accross the test and product development life. Feature API (not yet implemented) provide also easy access to all related testcases. Feature tree is generally very usefull for test planning point of view, it gives brief view, what kind of features we have, and what features we not coverage in tests.

### Campaings ###
Campaign are list of testcases. Campaign collect sertain amount or pre-defined types of test cases to one place. Campaign not neccessary have to be "static list" of test cases, it can be use dynamically so that all new testcases automatically belong to existing campaign as soon as test case information match to campaign specification. Campaign API provide easy access to manage campaign specification.

### Test Automation ###
(not yet implemented)
Test Automation is new intelligent way to manage test execution phase.
It contains rules like what should be test for each build. Backend contains job scheduler, which map test execution to most optimal resource we have in this system.

#### Jobs ####
Job contains information what should be done in Slave machine. For example, it could contains information like what test cases should be run in this type of DUT, or this software X should be update to version Y. So there is several different job types like "maintenance-job", "test-job", etc.. 

### Resources ###
(partially implemented)
Resource is physical resource, what is Limited amount.
Resource document contains all informations related Resource itself, like resource type, model, vendor, location, owner, administrator, ip-address, ...

Resources section also provide kind of resource locking -mechanism, which allows to allocate individual/multiple resources so that no-one else can use it meanwhile it is in use by another service (e.g. test automation client). E.g. if Test case require 4 DUT's it could allocate 4 DUT's from backend and start using them safely without interrupt. This allows to see also that what resources is in use in real time and follow resource utilization as well (not implemented)..

#### DUT ####
Dut (Device Under Type) is special type of resource. It is used in test cases: list of allowed DUT's for particular TC..

#### LAB equipments ####
LAB equipments are just one example of resource type.

#### Rooms ####
Room is also one example of resource type. We can map easily each resources to a rooms and collect list of all resources which is in that room. This way we can also easily fetch how much power is used in that room (of course if all resources has that kind of information). That information for example can be use to planning air conditions for rooms.

### Builds ###
Builds provide API to collect all CI artifacts to one common place. Also it provide easy way to query builds and fetch binary directly via Builds API. Also several kind of statistics can be also fetch from that API.

### Test Results ###
Test Result contains all information related Test Execution phase, like final verdict, traces/logs, Build Under test, Device Under Test, etc. These information can be use to reply test execution phase easily.


### Reports ###
(not yet implemented)
Report is like snapshot of datbase state in certain time period. Reports cannot be change afterward. Reports can be use any (some exceptions) other API's to fetch actual data to report. For example we could create Test Report from Test Results, or Test Case Report from Test Cases.

#### Reports template ####
(not yet implemented)
Report templates contains specification for Actual Report. Report template is like "view-template" which descibe how actual Report should look like. Report types can be for example
* PDF
* HTML
* Excel
* Word

### Addons ###
(partially implemented)
Way to extend this backend-service easily. Addon registry (future plan) contains information about existing addons, which can easily to install via administrator API.
There is available several example addons like:
* gui (first web-ui revision)
* github (github-repository integraiton)
* jenkins (jenkins-integration)
* slack (Slack messaging integration)
* test-suites (Allows to generate test suites from campaign)
* sample (just for example)

### How do I get set up? ###

* Summary of set up
* Configuration
`npm install`
* Dependencies
* Database configuration
* How to run tests
`npm test`
* How to start service
`npm start`
* Deployment instructions
`supervisor -wa . -n exit server.js`


### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact

## License

  [GPL-3.0](LICENSE.md)

[build-image]: https://img.shields.io/travis/OpenTMI/opentmi/master.svg?label=linux
[build-url]: https://travis-ci.org/OpenTMI/opentmi
[coveralls-image]: https://coveralls.io/repos/OpenTMI/opentmi/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/OpenTMI/opentmi?branch=master
