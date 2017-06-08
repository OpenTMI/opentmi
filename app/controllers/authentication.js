const qs = require('querystring');
const nconf = require('nconf');
const mongoose = require('mongoose');
const request = require('request');
const auth = require('./../../config/middlewares/authorization');
const jwt = require('jwt-simple');
const async = require('async');
const _ = require('lodash');
const winston = require('winston');

const User = mongoose.model('User');
const Group = mongoose.model('Group');

class Controller {
  constructor() {
    this.config = {
      GOOGLE_SECRET: nconf.get('google_secret'),
      TOKEN_SECRET: nconf.get('webtoken'),
    };

    /*
    |--------------------------------------------------------------------------
    | Login with Google
    |--------------------------------------------------------------------------
    */
    this.google = function (req, res) {
      const accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
      const peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
      const params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: this.config.GOOGLE_SECRET,
        redirect_uri: req.body.redirectUri,
        grant_type: 'authorization_code',
      };

      // Step 1. Exchange authorization code for access token.
      request.post(accessTokenUrl, { json: true, form: params }, (err, postResponse, token) => {
        const accessToken = token.access_token;
        const headers = { Authorization: `Bearer ${accessToken}` };

        // Step 2. Retrieve profile information about the current user.
        request.get({ url: peopleApiUrl, headers, json: true }, (err, getResponse, profile) => {
          if (profile.error) {
            return res.status(500).send({ message: profile.error.message });
          }

          // Step 3a. Link user accounts.
          if (req.headers.authorization) {
            User.findOne({ google: profile.sub }, (err, existingUser) => {
              if (existingUser) {
                return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
              }
              token = req.headers.authorization.split(' ')[1];
              const payload = jwt.decode(token, this.config.TOKEN_SECRET);
              User.findById(payload.sub, (err, user) => {
                if (!user) {
                  return res.status(400).send({ message: 'User not found' });
                }
                user.google = profile.sub;
                user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
                user.displayName = user.displayName || profile.name;
                user.save(() => {
                  const actualToken = auth.createJWT(user);
                  res.send({ token: actualToken });
                });
                return undefined;
              });

              return undefined;
            });
          } else {
            // Step 3b. Create a new user account or return an existing one.
            User.findOne({ google: profile.sub }, (err, existingUser) => {
              if (existingUser) {
                return res.send({ token: this.createJWT(existingUser) });
              }

              const user = new User();
              user.google = profile.sub;
              user.picture = profile.picture.replace('sz=50', 'sz=200');
              user.displayName = profile.name;
              user.save((err) => {
                const actualToken = auth.createJWT(user);
                res.send({ token: actualToken });
              });

              return undefined;
            });
          }

          return undefined;
        });
      });
    };
  }

  static loginRequiredResponse(req, res) {
    res.status(404).json({ error: 'login required' });
  }

  static apiKeyRequiredResponse(req, res) {
    res.status(404).json({ error: 'apikey required' });
  }

  /*
  |--------------------------------------------------------------------------
  | GET /api/me
  |--------------------------------------------------------------------------
  */
  getme(req, res) {
    User.findById(req.user.sub, (err, user) => {
      res.send(user);
    });
  }

  /*
  |--------------------------------------------------------------------------
  | PUT /api/me
  |--------------------------------------------------------------------------
  */
  putme(req, res) {
    User.findById(req.user.sub, (err, user) => {
      if (!user) {
        return res.status(400).send({ message: 'User not found' });
      }
      user.displayName = req.body.displayName || user.displayName;
      user.email = req.body.email || user.email;
      user.save((err) => {
        res.status(200).end();
      });
    });
  }

  signup(req, res) {
    User.findOne({ email: req.body.email }, (err, existingUser) => {
      if (existingUser) {
        return res.status(409).send({ message: 'Email is already taken' });
      }
      const user = new User({
        displayName: req.body.displayName,
        email: req.body.email,
        password: req.body.password,
      });
      user.save((err, result) => {
        if (err) {
          res.status(500).send({ message: err.message });
        }
        res.send({ token: auth.createJWT(result) });
      });
    });
  }

  login(req, res) {
    User.findOne({ email: req.body.email }, '+password', (err, user) => {
      if (!user) {
        return res.status(401).send({ message: 'Invalid email and/or password' });
      }
      user.comparePassword(req.body.password, (err, isMatch) => {
        if (!isMatch) {
          return res.status(401).send({ message: 'Invalid email and/or password' });
        }
        res.send({ token: auth.createJWT(user) });
      });
      return undefined;
    });
  }

  logout(req, res) {
    req.logout();
    res.json({ logout: 'success' });
  }

  loginRequired(req, res, next) {
    if (!req.user) {
      this.loginRequiredResponse(req, res);
    } else {
      next();
    }
  }

  apiKeyRequired(req, res, next) {
    User.apiKeyExists(req.query.apiKey, (error, ok) => {
      if (error) {
        this.apiKeyRequiredResponse(req, res);
      } else if (!ok) {
        this.apiKeyRequiredResponse(req, res);
      } else {
        next();
      }
    });
  }

  adminRequired(req, res, next) {
    if (!req.user) {
      this.loginRequiredResponse(req, res);
    } else if (!req.user.account_level) {
      res.status(404).json({ error: 'admin required' });
    } else {
      next();
    }
  }

  /*
|--------------------------------------------------------------------------
| Login with GitHub
|--------------------------------------------------------------------------
*/
  static getGithubClientId(req, res) {
    winston.log('Github auth: return github clientID');
    const id = nconf.get('github').clientID;
    if (id === undefined) {
      res.status(400).json({ error: 'found client id is undefined' });
    } else {
      res.status(200).json({ clientID: id });
    }
  }

  github(req, res) {
    const userApiUrl = 'https://api.github.com/user';
    const accessTokenUrl = 'https://github.com/login/oauth/access_token';

    /*
      Authorize the user using github by exchanging authorization code for access token.
    */
    const authorization = (callback) => {
      const params = {
        code: this.req.body.code,
        client_id: this.req.body.clientId,
        client_secret: nconf.get('github').clientSecret,
        redirect_uri: this.req.body.redirectUri,
      };

      request.get({ url: accessTokenUrl, qs: params }, (err, response, accessToken) => {
        if (err) {
          winston.info('Github auth: authorization error');
          callback({ status: 500, msg: err.toString() });
        } else {
          accessToken = qs.parse(accessToken);
          const headers = { 'User-Agent': 'Satellizer' };

          callback(null, accessToken, headers);
        }
      });
    };

    /*
      Retrieve the user's github profile.
    */
    const getProfile = (accessToken, headers, callback) => {
      request.get({ url: userApiUrl, qs: accessToken, headers, json: true }, (err, response, profile) => {
        if (err) {
          winston.info('Github auth: getProfile error');
          callback({ status: 500, msg: err.toString() });
        } else if (!err && response.statusCode !== 200) {
          winston.info('Github auth: bad profile response');
          callback({ status: 409, msg: 'Did not get github profile.' });
        } else if (!profile.email) {
          winston.info('Github auth: no email error');
          callback({ status: 409, msg: 'Did not get email address.' });
        } else {
          callback(null, accessToken, headers, profile);
        }
      });
    };

    /*
      Ensure the user belongs to the required organization.
    */
    const checkOrganization = (accessToken, headers, profile, callback) => {
      request.get({ url: `${userApiUrl}/orgs`, qs: accessToken, headers, json: true }, (err, response) => {
        if (err) {
          winston.info('Github auth: checkOrganization error');
          callback({ status: 500, msg: err.toString() });
        } else {
          const belongsOrg = _.find(response.body, { login: nconf.get('github').organization });

          if (belongsOrg) {
            callback(null, accessToken, headers, profile);
          } else {
            winston.info('Github auth: user not in organization');
            callback({ status: 401, msg: 'You do not have required access.' });
          }
        }
      });
    };

    /*
      Check if the user is an administrator or a normal employee in the organization.
    */
    const checkAdmin = (accessToken, headers, profile, callback) => {
      request.get({ url: `${this.github.userApiUrl}/teams`, qs: accessToken, headers, json: true }, (err, response) => {
        if (err) {
          winston.info('Github auth: checkAdmin error');
          callback({ status: 500, msg: err.toString() });
        } else {
          const isAdmin = _.find(response.body, (team) => {
            return team.name === nconf.get('github').adminTeam && team.organization.login === nconf.get('github').organization;
          });
          profile.group = isAdmin ? 'admins' : '';

          callback(null, profile);
        }
      });
    };

    /*
    Retrieve the user from the database, or create a new entry if the user does not exist.
    */
    const prepareUser = (profile, callback) => {
      User.findOne({ $or: [{ github: profile.login }, { email: profile.email }] }, (err, existingUser) => {
        // Check if the user account exists.
        if (existingUser) {
          winston.info('Return an existing user account.');

          if (this.req.headers.authorization) {
            winston.info('Github auth: user authorized already');
            callback({ status: 409, msg: 'There is already a GitHub account that belongs to you' });
          } else if (existingUser.github !== profile.login) {
            winston.info('Github auth: updated github username');
            existingUser.github = profile.login;
            callback(null, existingUser, profile.group);
          } else {
            callback(null, existingUser, profile.group);
          }
        } else if (this.req.headers.authorization) {
          winston.info('Link user account with github account.');

          User.findById(this.req.user.sub, (err, user) => {
            if (!user) {
              winston.info('Github auth: no user found');
              return callback({ status: 400, msg: 'User not found' });
            }

            user.github = profile.login;
            user.picture = user.picture || profile.avatar_url;
            user.displayName = user.displayName || profile.name;
            user.name = user.displayName;
            user.email = user.email;
            callback(null, user, profile.group);

            return undefined;
          });
        } else {
          winston.info('Create a new user account.');

          const user = new User();
          user.github = profile.login;
          user.picture = profile.avatar_url;
          user.displayName = profile.name;
          user.name = user.displayName;
          user.email = profile.email;
          callback(null, user, profile.group);
        }
      });
    };

    /*
      Update the user's admin status.
    */
    const updateUser = (pUser, groupname, callback) => {
      winston.log('Github auth: update user');
      Group.findOne({ users: pUser, name: 'admins' }, (err, group) => {
        if (group && groupname !== 'admins') {
          pUser.removeFromGroup('admins', (user) => {
            if (user.message) {
              callback({ status: 500, msg: user.message });
            } else {
              user.save(callback(null, auth.createJWT(user, groupname)));
            }
          });
        } else if (!group && groupname === 'admins') {
          pUser.addToGroup('admins', (user) => {
            if (user.message) {
              callback({ status: 500, msg: user.message });
            } else {
              user.save(callback(null, auth.createJWT(user, groupname)));
            }
          });
        } else {
          pUser.save(callback(null, auth.createJWT(pUser, groupname)));
        }
      });

      let final = function (err, token) {
        if (err) {
          return res.status(err.status).json({
            message: err.msg,
          });
        }
        return res.send({ token });
      };

      async.waterfall([
        authorization,
        getProfile,
        checkOrganization,
        checkAdmin,
        prepareUser,
        updateUser,
      ], final);
    };
  }
}

module.exports = Controller;
