require('colors');

const qs = require('querystring');
const nconf = require('nconf');
const mongoose = require('mongoose');
const request = require('request');
const auth = require('./../../config/middlewares/authorization');
const jwt = require('jwt-simple');
const async = require('async');
const _ = require('lodash');
const logger = require('winston');

const User = mongoose.model('User');
const Group = mongoose.model('Group');

const googleSecret = nconf.get('google_secret');
const tokenSecret = nconf.get('webtoken');
const githubAdminTeam = nconf.get('github').adminTeam;
const githubOrganization = nconf.get('github').organization;
const clientId = nconf.get('github').clientID;
const clientSecret = nconf.get('github').clientSecret;

let loginCount = 0;

class AuthenticationController {
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
    logger.info('Logging in');
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
    logger.log('Github auth: returning github clientID');
    const id = clientId;
    if (id === undefined) {
      logger.warn('Github auth: clientId was undefined, perhaps it is not defined in the config.');
      res.status(400).json({ error: 'found client id is undefined' });
    } else {
      res.status(200).json({ clientID: id });
    }
  }

  static github(req, res) {
    // Setup logging
    const loginId = loginCount;
    loginCount += 1;
    const addPrefix = msg => `Github login #${loginId}: ${msg}`;

    // Authentication process
    logger.info(addPrefix('starting authentication process via github.'));
    const userApiUrl = 'https://api.github.com/user';
    const accessTokenUrl = 'https://github.com/login/oauth/access_token';

    /*
      Authorize the user using github by exchanging authorization code for access token.
    */
    const authorization = (callback) => {
      logger.debug(addPrefix('fetching access token from github.'));
      const params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: clientSecret,
        redirect_uri: req.body.redirectUri,
      };

      logger.verbose(addPrefix('requesting github access token.'));
      request.get({ url: accessTokenUrl, qs: params }, (err, response, accessToken) => {
        logger.verbose(addPrefix(`response from: ${accessTokenUrl} received.`));

        // Process error if one happened
        if (err) {
          logger.warn(addPrefix(`authorization error at url: ${accessTokenUrl} with redirect_uri: ${params.redirect_uri} and client_id: ${params.client_id}.`));
          return callback({ status: 500, msg: err.message });
        }

        const parsedAccessToken = qs.parse(accessToken);
        const headers = { 'User-Agent': 'Satellizer' };

        logger.verbose(addPrefix('github access token parsed and ready.'));
        return callback(null, parsedAccessToken, headers);
      });
    };

    /*
      Retrieve the user's github profile.
    */
    const getProfile = (accessToken, headers, callback) => {
      logger.debug(addPrefix('fetching user profile information from github.'));

      logger.verbose(addPrefix('requesting profile information.'));
      request.get({ url: userApiUrl, qs: accessToken, headers, json: true }, (err, response, profile) => {
        logger.verbose(addPrefix(`response from: ${userApiUrl} received.`));

        // Process error if one happened
        if (err) {
          logger.warn(addPrefix(`getProfile error, failed to fetch user profile information from url: ${userApiUrl}.`));
          return callback({ status: 500, msg: err.toString() });
        }

        // Make sure response was a 200 success
        if (response.statusCode !== 200) {
          logger.warn(addPrefix(`bad profile response with status code: ${response.statusCode}.`));
          return callback({ status: 409, msg: `Could not fetch github profile. Response body: ${JSON.stringify(response.body)}` });
        }

        // Make sure profile contains an email
        if (!profile.email) {
          logger.warn(addPrefix('could not find email from fetched profile.'));
          return callback({ status: 409, msg: 'Could not find email address from profile.' });
        }

        logger.verbose(addPrefix('response contained a valid profile.'));
        return callback(null, accessToken, headers, profile);
      });
    };

    /*
      Ensure the user belongs to the required organization.
    */
    const checkOrganization = (accessToken, headers, profile, callback) => {
      logger.debug(addPrefix('fetching list of organizations user belongs to.'));

      logger.verbose(addPrefix('requesting organization information.'));
      const orgUrl = `${userApiUrl}/orgs`;
      request.get({ url: orgUrl, qs: accessToken, headers, json: true }, (err, response) => {
        logger.verbose(addPrefix(`response from: ${orgUrl} received.`));

        // Process error if one happened
        if (err) {
          logger.warn(addPrefix(`checkOrganization error, failed to fetch user organization information from url: ${orgUrl}.`));
          return callback({ status: 500, msg: err.toString() });
        }

        // Attempt to find the defined organization from a list of the users organizations
        const belongsOrg = _.find(response.body, { login: githubOrganization });
        if (!belongsOrg) {
          logger.warn(addPrefix(`user not in ${githubOrganization} organization.`));
          return callback({ status: 401, msg: `You do not have required access to ${githubOrganization}.` });
        }

        logger.verbose(addPrefix(`user belongs to organization: ${githubOrganization}, which has access to this server.`));
        return callback(null, accessToken, headers, profile);
      });
    };

    /*
      Check if the user is an administrator or a normal employee in the organization.
    */
    const checkAdmin = (accessToken, headers, profile, callback) => {
      logger.debug(addPrefix('checking if the user is in the administrator team.'));

      logger.verbose(addPrefix('requesting list of teams where user is a member.'));
      const teamUrl = `${userApiUrl}/teams`;
      request.get({ url: teamUrl, qs: accessToken, headers, json: true }, (err, response) => {
        logger.verbose(addPrefix(`response from: ${teamUrl} received`));

        // Process error if one happened
        if (err) {
          logger.warn(addPrefix(`checkAdmin error, failed to fetch user's team information from url: ${teamUrl}`));
          return callback({ status: 500, msg: err.toString() });
        }

        // Attempt to find the correct admin team from list of teams the user belongs to
        const isAdmin = _.find(response.body, team => (team.name === githubAdminTeam && team.organization.login === githubOrganization));
        profile.group = isAdmin ? 'admins' : '';

        logger.verbose(addPrefix(`user belongs to group: ${profile.group}`));
        return callback(null, profile);
      });
    };

    /*
    Retrieve the user from the database, or create a new entry if the user does not exist.
    */
    const updateUser = (profile, callback) => {
      logger.debug(addPrefix('updating user information with profile information.'));

      logger.verbose(addPrefix('attempting to find user from the database.'));
      User.findOne({ $or: [{ github: profile.login }, { email: profile.email }] }, (err, existingUser) => {
        logger.verbose(addPrefix('response from database received.'));

        // Check if the user account exists.
        if (existingUser) {
          logger.verbose(addPrefix(`user: ${existingUser._id} found from the database.`));

          // Ensure user is not already authorized
          if (req.headers.authorization) {
            logger.warn(addPrefix(`user: ${existingUser._id} is authorized already.`));
            return callback({ status: 409, msg: `There is already an account linked to github that belongs to you with id: ${existingUser._id}.` });
          }

          // Updating username if it has changed
          if (existingUser.github !== profile.login) {
            logger.debug(addPrefix(`updating github username from ${existingUser.github} to ${profile.login}.`));
            existingUser.github = profile.login;
            return callback(null, existingUser, profile.group);
          }

          return callback(null, existingUser, profile.group);
        }

        // Create new user account if we cannot find user linked to github and request header does not contain authorization
        if (!req.headers.authorization) {
          logger.info(addPrefix('creating a new account for user.'));

          // Create new user and parse fields from profile
          const user = new User();
          user.github = profile.login;
          user.picture = profile.avatar_url;
          user.displayName = profile.name;
          user.name = user.displayName;
          user.email = profile.email;

          logger.verbose(addPrefix(`new account created with id: ${user._id}.`));
          return callback(null, user, profile.group);
        }

        // If we cannot find user linked to github but header contains authorization, link active account with github
        logger.info(addPrefix('linking existing user account with github.'));
        User.findById(req.user.sub, (err, user) => {
          logger.verbose(addPrefix('response received from database.'));

          if (!user) {
            logger.warn(addPrefix(`no user found with id: ${req.user.sub}`));
            return callback({ status: 400, msg: 'User already exists but could not be found.' });
          }

          // Parse fields from profile to existing user
          user.github = profile.login;
          user.picture = user.picture || profile.avatar_url;
          user.displayName = user.displayName || profile.name;
          user.name = user.displayName;
          user.email = user.email;

          logger.verbose(addPrefix('user linked to github.'));
          return callback(null, user, profile.group);
        });

        return undefined;
      });
    };

    /*
      Update the user's admin status.
    */
    const updateUsersGroup = (pUser, groupname, callback) => {
      logger.debug(addPrefix('updating user\'s group to match current status.'));
      Group.findOne({ users: pUser, name: 'admins' }, (err, group) => {
        logger.verbose(addPrefix('response received from database.'));

        // If group was found but groupname is not admins, remove user from admins
        if (group && groupname !== 'admins') {
          logger.info(addPrefix(`removing user: ${pUser._id} from admins.`));
          pUser.removeFromGroup('admins', (user) => {  // TODO: should use either promise or a more standard callback format (err, user)
            logger.verbose(addPrefix('removing from group finished.'));

            // If user has a message, error has occured
            if (user.message) {
              logger.error(addPrefix(`user: ${pUser._id} could not be removed from admins group.`));
              return callback({ status: 500, msg: user.message });
            }

            // Save user and create token with groupname
            logger.verbose(addPrefix('user removed from group successfully.'));
            return callback(null, user, groupname);
          });
        } else if (!group && groupname === 'admins') {
          logger.info(addPrefix(`adding user: ${pUser._id} to admins.`));
          pUser.addToGroup('admins', (user) => {
            logger.verbose(addPrefix('adding to group finished.'));

            // If user has a message, error has occured
            if (user.message) {
              logger.error(addPrefix(`user: ${pUser._id} could not be added to the admins group.`));
              return callback({ status: 500, msg: user.message });
            }

            // Save user and create token with groupname
            logger.verbose(addPrefix('user added to group successfully.'));
            return callback(null, user, groupname);
          });
        } else {
          logger.verbose(addPrefix(`user is in the correct group: ${groupname}.`));

          // Save user and create token with groupname
          return callback(null, pUser, groupname);
        }

        return undefined;
      });
    };

    /*
      Save changes made to user
    */
    const saveUser = (user, groupname, callback) => {
      logger.debug(addPrefix('saving changes to user.'));
      user.save((err) => {
        logger.verbose(addPrefix('user saving finished.'));

        // Handle saving error if necessary
        if (err) {
          logger.error(addPrefix(`could not save changes to user: ${user._id}.`));
          return callback({ status: 500, msg: err.toString() });
        }

        logger.verbose(addPrefix('creating a token for the user.'));
        return callback(null, auth.createJWT(user, groupname));
      });

      return undefined;
    };

    /*
      Catches any errors that happened during authentication and sends results accordingly
    */
    const final = function (err, token) {
      logger.info(addPrefix('authentication via github finished.'));
      if (err) {
        logger.warn(addPrefix(`authentication failed due to error with status: ${err.status} and message: "${err.msg}", see above for details.`));
        return res.status(err.status).json({ message: err.toString() });
      }
      return res.send({ token });
    };

    logger.verbose(addPrefix('starting waterfall of authentication tasks'));
    async.waterfall([
      authorization,
      getProfile,
      checkOrganization,
      checkAdmin,
      updateUser,
      updateUsersGroup,
      saveUser,
    ], final);
  }

  /*
  |--------------------------------------------------------------------------
  | Login with Google
  |--------------------------------------------------------------------------
  */
  google(req, res) {
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
            const payload = jwt.decode(token, tokenSecret);
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
  }
}

module.exports = AuthenticationController;
