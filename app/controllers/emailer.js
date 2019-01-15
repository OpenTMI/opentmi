// 3rd party modules
const _ = require('lodash');
const nodemailer = require('nodemailer');
// internal modules
const logger = require('../tools/logger');


let emailer = {send: () => Promise.reject('emailer is not configured')};


class Emailer {
  constructor(config) {
    this._smtpTransport = _.get(config, 'enabled') ?
      Emailer._initialize(_.omit(config, ['enabled'])) : Emailer.getDummyTransport();
    emailer = this;
  }
  static getDummyTransport() {
    logger.info('smtp is not configured, cannot send emails');
    return {
      verify: () => Promise.resolve(),
      sendMail: () => Promise.reject(new Error('smtp is not configured to server'))
    };
  }
  static _initialize(config) {
    const mailerConfig = _.defaults(config, {
      host: 'smtp.gmail.com',
      port: 25,
      secure: false,
      connectionTimeout: 5000,
      tls: {
        rejectUnauthorized: false
      }
    });
    return nodemailer.createTransport(mailerConfig);
  }
  verify() {
    return this._smtpTransport.verify()
      .then((value) => {
        if (value === undefined) {
          return;
        }
        logger.debug('smtp verified - ok');
      });
  }
  static send(data) {
    return emailer.send(data);
  }
  send({to, from = 'admin@opentmi.com', subject, text}) {
    const mailOptions = {to, from, subject, text};
    logger.silly(`sending mail: ${JSON.stringify(mailOptions)}`);
    return this._smtpTransport.sendMail(mailOptions)
      .then(() => {
        logger.info(`Sent email to "${to}" with subject: "${subject}"`);
      });
  }
}

module.exports = Emailer;
