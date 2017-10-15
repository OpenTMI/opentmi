require('colors');

const qs = require('querystring');
const nconf = require('../../config');
const mongoose = require('mongoose');
const request = require('request');
const auth = require('./../../config/middlewares/authorization');
const jwt = require('jwt-simple');
const async = require('async');
const _ = require('lodash');

const User = mongoose.model('User');
const Group = mongoose.model('Group');

const logger = require('../tools/logger');
// const googleSecret = nconf.get('google_secret');
const tokenSecret = nconf.get('webtoken');
const githubAdminTeam = nconf.get('github').adminTeam;
const githubOrganization = nconf.get('github').organization;
const clientId = nconf.get('github').clientID;
const clientSecret = nconf.get('github').clientSecret;

let loginCount = 0;

class AuthenticationController {
  static loginRequiredResponse(req, res) {
    res.status(404).json({error: 'login required'});
  }

  static apiKeyRequiredResponse(req, res) {
    res.status(404).json({error: 'apikey required'});
  }

  /*
  |--------------------------------------------------------------------------
  | GET /api/me
  |--------------------------------------------------------------------------
  */
  getme(req, res) { // eslint-disable-line class-methods-use-this
    User.findById(req.user.sub, (error, user) => {
      res.send(user);
    });
  }

  /*
  |--------------------------------------------------------------------------
  | PUT /api/me
  |--------------------------------------------------------------------------
  */
  putme(req, res) { // eslint-disable-line class-methods-use-this
    User.findById(req.user.sub, (error, user) => {
      if (!user) {
        return res.status(400).send({message: 'User not found'});
      }

      const editedUser = user;
      editedUser.displayName = req.body.displayName || user.displayName;
      editedUser.email = req.body.email || user.email;
      editedUser.save(() => {
        res.status(200).end();
      });

      return undefined;
    });
  }

  signup(req, res) { // eslint-disable-line class-methods-use-this
    User.findOne({email: req.body.email}, (error, user) => {
      if (user) {
        return res.status(409).send({message: 'Email is already taken'});
      }
      const newUser = new User({
        displayName: req.body.displayName,
        email: req.body.email,
        password: req.body.password
      });

      newUser.save((saveError, result) => {
        if (saveError) {
          res.status(500).send({message: saveError.message});
        }
        auth.createJWT(result)
          .then(token => res.json({token}));
      });

      return undefined;
    });
  }

  login(req, res) { // eslint-disable-line class-methods-use-this
    logger.info('Logging in');
    User.findOne({email: req.body.email}, '+password', (error, user) => {
      if (!user) {
        return res.status(401).send({message: 'Invalid email and/or password'});
      }
      user.comparePassword(req.body.password, (compareError, isMatch) => {
        if (!isMatch) {
          return res.status(401).send({message: 'Invalid email and/or password'});
        }
        return auth.createJWT(user)
          .then(token => res.json({token}));
      });
      return undefined;
    });
  }

  logout(req, res) { // eslint-disable-line class-methods-use-this
    req.logout();
    res.json({logout: 'success'});
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
      res.status(404).json({error: 'admin required'});
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
    logger.info('Github auth: returning github clientID');
    const id = clientId;
    if (id === undefined) {
      logger.warn('Github auth: clientId was undefined, perhaps it is not defined in the config.');
      res.status(400).json({error: 'found client id is undefined'});
    } else {
      res.status(200).json({clientID: id});
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
    const authorization = (next) => {
      logger.debug(addPrefix('fetching access token from github.'));
      const params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: clientSecret,
        redirect_uri: req.body.redirectUri
      };

      logger.verbose(addPrefix('requesting github access token.'));
      request.get({url: accessTokenUrl, qs: params}, (error, response, accessToken) => {
        logger.verbose(addPrefix(`response from: ${accessTokenUrl} received.`));

        // Process error if one happened
        if (error) {
          logger.warn(addPrefix('authorization error at '
          + `url: ${accessTokenUrl} with redirect_uri: ${params.redirect_uri} and client_id: ${params.client_id}.`));
          return next({status: 500, msg: error.message});
        }

        const parsedAccessToken = qs.parse(accessToken);
        const headers = {'User-Agent': 'Satellizer'};

        logger.verbose(addPrefix('github access token parsed and ready.'));
        return next(null, parsedAccessToken, headers);
      });
    };

    /*
      Retrieve the user's github profile.
    */
    const getProfile = (accessToken, headers, next) => {
      logger.debug(addPrefix('fetching user profile information from github.'));

      logger.verbose(addPrefix('requesting profile information.'));
      request.get({url: userApiUrl, qs: accessToken, headers: headers, json: true}, (error, response, profile) => {
        logger.verbose(addPrefix(`response from: ${userApiUrl} received.`));

        // Process error if one happened
        if (error) {
          logger.warn(addPrefix(`getProfile error, failed to fetch user profile information from url: ${userApiUrl}.`));
          return next({status: 500, msg: error.toString()});
        }

        // Make sure response was a 200 success
        if (response.statusCode !== 200) {
          logger.warn(addPrefix(`bad profile response with status code: ${response.statusCode}.`));
          return next({
            status: 409,
            msg: `Could not fetch github profile. Response body: ${JSON.stringify(response.body)}`
          });
        }

        // Make sure profile contains an email
        if (!profile.email) {
          logger.warn(addPrefix('could not find email from fetched profile, email is probably set to private.'));
        }

        logger.verbose(addPrefix('response contained a valid profile.'));
        return next(null, accessToken, headers, profile);
      });
    };

    /*
      Retrieve the user's github profile email.
    */
    const getEmail = (accessToken, headers, profile, next) => {
      logger.debug(addPrefix('fetching user email information from github.'));

      if (profile.email) {
        next(null, accessToken, headers, profile);
        return;
      }

      logger.verbose(addPrefix('requesting user email information.'));
      const userEmailUrl = `${userApiUrl}/emails`;
      request.get({url: userEmailUrl, qs: accessToken, headers: headers, json: true}, (error, response, emails) => {
        logger.verbose(addPrefix(`response from: ${userEmailUrl} received.`));

        // Process error if one happened
        if (error) {
          logger.warn(addPrefix(`getEmail error, failed to fetch user github emails from url: ${userEmailUrl}.`));
          return next({status: 500, msg: error.toString()});
        }

        // Make sure response was a 200 success
        if (response.statusCode !== 200) {
          logger.warn(addPrefix(`bad profile emails response with status code: ${response.statusCode}.`));
          return next({
            status: 500,
            msg: `Could not fetch github profile. Response body: ${JSON.stringify(response.body)}`
          });
        }

        // Make sure received response is an array and not empty
        if (!_.isArray(emails) || emails.length === 0) {
          logger.warn(addPrefix(
            `received response was not an array with at least one item. Response: ${JSON.stringify(emails)}`));
          return next({
            status: 500,
            msg: `Could not fetch emails from github user, received invalid response body: ${JSON.stringify(emails)}.`
          });
        }

        // Find and return the primary email
        logger.verbose(addPrefix('response contained valid emails.'));
        for (let i = 0; i < emails.length; i += 1) {
          logger.info(JSON.stringify(emails[i]));
          if (emails[i].primary) {
            if (!emails[i].verified) {
              logger.warn(addPrefix('user primary email is unverified.'));
            }

            _.set(profile, 'email', emails[i].email);
            return next(null, accessToken, headers, profile);
          }
        }

        // Return the first email
        _.set(profile, 'email', emails[0].email);
        return next(null, accessToken, headers, profile);
      });
    };

    /*
      Ensure the user belongs to the required organization.
    */
    const checkOrganization = (accessToken, headers, profile, next) => {
      logger.debug(addPrefix('fetching list of organizations user belongs to.'));

      logger.verbose(addPrefix('requesting organization information.'));
      const orgUrl = `${userApiUrl}/orgs`;
      request.get({url: orgUrl, qs: accessToken, headers: headers, json: true}, (error, response) => {
        logger.verbose(addPrefix(`response from: ${orgUrl} received.`));

        // Process error if one happened
        if (error) {
          logger.warn(addPrefix('checkOrganization error, failed to fetch user organization information from '
          + `url: ${orgUrl}.`));
          return next({status: 500, msg: error.toString()});
        }

        // Attempt to find the defined organization from a list of the users organizations
        const belongsOrg = _.find(response.body, {login: githubOrganization});
        if (!belongsOrg) {
          logger.warn(addPrefix(`user not in ${githubOrganization} organization.`));
          return next({status: 401, msg: `You do not have required access to ${githubOrganization}.`});
        }

        logger.verbose(addPrefix('user belongs to '
        + `organization: ${githubOrganization}, which has access to this server.`));
        return next(null, accessToken, headers, profile);
      });
    };

    /*
      Check if the user is an administrator or a normal employee in the organization.
    */
    const checkAdmin = (accessToken, headers, profile, next) => {
      logger.debug(addPrefix('checking if the user is in the administrator team.'));

      logger.verbose(addPrefix('requesting list of teams where user is a member.'));
      const teamUrl = `${userApiUrl}/teams`;
      request.get({url: teamUrl, qs: accessToken, headers: headers, json: true}, (error, response) => {
        logger.verbose(addPrefix(`response from: ${teamUrl} received`));

        // Process error if one happened
        if (error) {
          logger.warn(addPrefix(`checkAdmin error, failed to fetch user's team information from url: ${teamUrl}`));
          return next({status: 500, msg: error.toString()});
        }

        const editedProfile = profile;

        // Attempt to find the correct admin team from list of teams the user belongs to
        const isAdmin = _.find(response.body, team =>
          (team.name === githubAdminTeam && team.organization.login === githubOrganization));
        editedProfile.group = isAdmin ? 'admins' : '';

        logger.verbose(addPrefix(`user belongs to group: ${editedProfile.group}`));
        return next(null, editedProfile);
      });
    };

    /*
    Retrieve the user from the database, or create a new entry if the user does not exist.
    */
    const updateUser = (profile, next) => {
      logger.debug(addPrefix('updating user information with profile information.'));

      logger.verbose(addPrefix('attempting to find user from the database.'));
      User.findOne({$or: [{github: profile.login}, {email: profile.email}]}, (error, user) => {
        logger.verbose(addPrefix('response from database received.'));

        // Check if the user account exists.
        if (user) {
          logger.verbose(addPrefix(`user: ${user._id} found from the database.`));

          // Ensure user is not already authorized
          if (req.headers.authorization) {
            logger.warn(addPrefix(`user: ${user._id} is authorized already.`));
            return next({
              status: 409,
              msg: `There is already an account linked to github that belongs to you with id: ${user._id}.`});
          }

          // Updating username if it has changed
          if (user.github !== profile.login) {
            logger.debug(addPrefix(`updating github username from ${user.github} to ${profile.login}.`));

            const editedUser = user;
            editedUser.github = profile.login;
            return next(null, editedUser, profile.group);
          }

          return next(null, user, profile.group);
        }

        // Create new user account if we cannot find user linked to github and request header is not authorized
        if (!req.headers.authorization) {
          logger.info(addPrefix('creating a new account for user.'));

          // Create new user and parse fields from profile
          const newUser = new User();
          newUser.github = profile.login;
          newUser.picture = profile.avatar_url;
          newUser.displayName = profile.name;
          newUser.name = newUser.displayName;
          newUser.email = profile.email;

          logger.verbose(addPrefix(`new account created with id: ${newUser._id}.`));
          return next(null, newUser, profile.group);
        }

        // If we cannot find user linked to github but header contains authorization, link active account with github
        logger.info(addPrefix('linking existing user account with github.'));
        User.findById(req.user.sub, (findError, foundUser) => {
          logger.verbose(addPrefix('response received from database.'));

          if (!foundUser) {
            logger.warn(addPrefix(`no user found with id: ${req.user.sub}`));
            return next({status: 400, msg: 'User already exists but could not be found.'});
          }

          // Parse fields from profile to existing user
          const editedUser = foundUser;
          editedUser.github = profile.login;
          editedUser.picture = foundUser.picture || profile.avatar_url;
          editedUser.displayName = foundUser.displayName || profile.name;
          editedUser.name = foundUser.displayName;
          editedUser.email = foundUser.email;

          logger.verbose(addPrefix('user linked to github.'));
          return next(null, editedUser, profile.group);
        });

        return undefined;
      });
    };

    /*
      Update the user's admin status.
    */
    const updateUsersGroup = (user, groupname, next) => {
      logger.debug(addPrefix('updating user\'s group to match current status.'));
      Group.findOne({users: user, name: 'admins'}, (error, group) => {
        logger.verbose(addPrefix('response received from database.'));

        // If group was found but groupname is not admins, remove user from admins
        if (group && groupname !== 'admins') {
          logger.info(addPrefix(`removing user: ${user._id} from admins.`));

          // TODO: should use either promise or a more standard callback format (err, user)
          user.removeFromGroup('admins', (response) => {
            logger.verbose(addPrefix('removing from group finished.'));

            // If response has a message, error has occured
            if (response.message) {
              logger.error(addPrefix(`user: ${response._id} could not be removed from admins group.`));
              return next({status: 500, msg: response.message});
            }

            // Save user and create token with groupname
            logger.verbose(addPrefix('user removed from group successfully.'));
            return next(null, response);
          });
        } else if (!group && groupname === 'admins') {
          logger.info(addPrefix(`adding user: ${user._id} to admins.`));
          user.addToGroup('admins', (result) => {
            logger.verbose(addPrefix('adding to group finished.'));

            // If result has a message, error has occured
            if (result.message) {
              logger.error(addPrefix(`user: ${result._id} could not be added to the admins group.`));
              return next({status: 500, msg: result.message});
            }

            // Save result/user and create token with groupname
            logger.verbose(addPrefix('user added to group successfully.'));
            return next(null, result);
          });
        } else {
          logger.verbose(addPrefix(`user is in the correct group: ${groupname}.`));

          // Save user and create token with groupname
          return next(null, user);
        }

        return undefined;
      });
    };

    /*
      Save changes made to user
    */
    const saveUser = (user, next) => {
      logger.debug(addPrefix('saving changes to user.'));
      user.save((error) => {
        logger.verbose(addPrefix('user saving finished.'));

        // Handle saving error if necessary
        if (error) {
          logger.error(addPrefix(`could not save changes to user: ${user._id}.`));
          return next({status: 500, msg: error.toString()});
        }

        logger.verbose(addPrefix('creating a token for the user.'));
        return auth.createJWT(user)
          .then((token) => {
            next(null, token);
          });
      });

      return undefined;
    };

    /*
      Catches any errors that happened during authentication and sends results accordingly
    */
    const final = (error, token) => {
      logger.info(addPrefix('authentication via github finished.'));
      if (error) {
        logger.warn(addPrefix('authentication failed due to error with '
        + `status: ${error.status} and message: "${error.msg}", see above for details.`));
        return res.status(error.status).json({message: error.toString()});
      }
      return res.send({token: token});
    };

    logger.verbose(addPrefix('starting waterfall of authentication tasks'));
    async.waterfall([
      authorization,
      getProfile,
      getEmail,
      checkOrganization,
      checkAdmin,
      updateUser,
      updateUsersGroup,
      saveUser
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
      grant_type: 'authorization_code'
    };

    // Step 1. Exchange authorization code for access token.
    request.post(accessTokenUrl, {json: true, form: params}, (postError, postResponse, token) => {
      const accessToken = token.acnpmcess_token;
      const headers = {Authorization: `Bearer ${accessToken}`};

      // Step 2. Retrieve profile information about the current user.
      request.get({url: peopleApiUrl, headers, json: true}, (getError, getResponse, profile) => {
        if (profile.error) {
          return res.status(500).send({message: profile.error.message});
        }

        // Step 3a. Link user accounts.
        if (req.headers.authorization) {
          User.findOne({google: profile.sub}, (error, existingUser) => {
            if (existingUser) {
              return res.status(409).send({message: 'There is already a Google account that belongs to you'});
            }

            const parsedToken = req.headers.authorization.split(' ')[1];
            const payload = jwt.decode(parsedToken, tokenSecret);
            User.findById(payload.sub, (findError, user) => {
              if (!user) {
                return res.status(400).send({message: 'User not found'});
              }

              const editedUser = user;
              editedUser.google = profile.sub;
              editedUser.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
              editedUser.displayName = user.displayName || profile.name;
              editedUser.save(() => {
                auth.createJWT(editedUser)
                  .then(jwtToken => res.json({jwtToken}));
              });
              return undefined;
            });

            return undefined;
          });
        } else {
          // Step 3b. Create a new user account or return an existing one.
          User.findOne({google: profile.sub}, (error, existingUser) => {
            if (existingUser) {
              return this.createJWT(existingUser)
                .then(jwtToken => res.json({jwtToken}));
            }

            const newUser = new User();
            newUser.google = profile.sub;
            newUser.picture = profile.picture.replace('sz=50', 'sz=200');
            newUser.displayName = profile.name;
            newUser.save(() => {
              auth.createJWT(newUser)
                .then(jwtToken => res.json({jwtToken}));
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
