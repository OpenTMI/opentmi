// 3rd party modules
const request = require('request-promise');
const mongoose = require('mongoose');

// application modules
const logger = require('../../tools/logger');
const nconf = require('../../tools/config');

// implementation
const User = mongoose.model('User');
const Group = mongoose.model('Group');
const githubAdminTeam = nconf.get('github').adminTeam;
const githubOrganization = nconf.get('github').organization;

const userApiUrl = 'https://api.github.com/user';


class Github {
    static createUserFromGithubProfile(profile) {
        logger.silly(`create new user from github profile: ${profile.login}`);
        const newUser = new User();
        newUser.name = profile.displayName;
        newUser.github = profile._json.username;
        newUser.picture = profile._json.avatar_url;
        newUser.displayName = profile.displayName;
        newUser.email = profile._json.email;
        return newUser.save();
      }
    // Ensure the user belongs to the required organization.
    static checkOrganization(accessToken, headers) {
      logger.debug(addPrefix('fetching list of organizations user belongs to.'));

      logger.verbose('requesting organization information.');
      const orgUrl = `${userApiUrl}/orgs`;
      return request.get({url: orgUrl, qs: accessToken, headers: headers, json: true})
          .catch((error) => {
            logger.warn('checkOrganization error, failed to fetch user organization information from '
              + `url: ${orgUrl}.`);
            throw new Error({status: 500, msg: error.toString()});
          })
          .then((response) => {
            logger.verbose(`response from: ${orgUrl} received.`);

            // Attempt to find the defined organization from a list of the users organizations
            const belongsOrg = _.find(response.body, {login: githubOrganization});
            if (!belongsOrg) {
              logger.warn(`user not in ${githubOrganization} organization.`);
              throw new Error({status: 401, msg: `You do not have required access to ${githubOrganization}.`});
            }

            logger.verbose('user belongs to '
            + `organization: ${githubOrganization}, which has access to this server.`);
            return {accessToken, headers};
          });
    };

    // Check if the user is an administrator or a normal employee in the organization.
    static checkAdmin(accessToken, headers) {
      logger.debug(addPrefix('checking if the user is in the administrator team.'));

      logger.verbose('requesting list of teams where user is a member.');
      const teamUrl = `${userApiUrl}/teams`;
      return request.get({url: teamUrl, qs: accessToken, headers: headers, json: true})
          .catch((error) => {
            logger.warn(`checkAdmin error, failed to fetch user's team information from url: ${teamUrl}`);
            throw new Error({status: 500, msg: error.toString()});
          })
          .then((response) => {
            logger.verbose(`response from: ${teamUrl} received`);
            // Attempt to find the correct admin team from list of teams the user belongs to
            const isAdmin = _.find(response.body, team =>
              (team.name === githubAdminTeam && team.organization.login === githubOrganization));
            logger.verbose('user belongs to group');
            return isAdmin;
          });
    }

    // Retrieve the user from the database, or create a new entry if the user does not exist.
    static updateUser(req, profile) {
      logger.debug('updating user information with profile information.');
      logger.verbose('attempting to find user from the database.');
      return User.findOne({$or: [{github: profile.login}, {email: profile.email}]})
          .catch((error) => {

          })
          .then((user) => {
            logger.verbose('response from database received.');

            // Check if the user account exists.
            if (user) {
              logger.verbose(`user: ${user._id} found from the database.`);

              // Ensure user is not already authorized
              if (req.headers.authorization) {
                logger.warn(`user: ${user._id} is authorized already.`);
                throw new Error({
                  status: 409,
                  msg: `There is already an account linked to github that belongs to you with id: ${user._id}.`
                });
              }

              // Updating username if it has changed
              if (user.github !== profile.login) {
                logger.debug(`updating github username from ${user.github} to ${profile.login}.`);
                user.github = profile.login;
                return user.save();
              }
              return user;
          }

        // Create new user account if we cannot find user linked to github and request header is not authorized
        if (!req.headers.authorization) {
          logger.info('creating a new account for user.');

          // Create new user and parse fields from profile
          const newUser = new User();
          newUser.github = profile.login;
          newUser.picture = profile.avatar_url;
          newUser.displayName = profile.name;
          newUser.name = newUser.displayName;
          newUser.email = profile.email;

          logger.verbose(`new account created with id: ${newUser._id}.`);
          return newUser.save();
        }

        // If we cannot find user linked to github but header contains authorization, link active account with github
        logger.info('linking existing user account with github.');
        User.findById(req.user._id, (findError, foundUser) => {
          logger.verbose('response received from database.');

          if (!foundUser) {
            this.logger.warn(`no user found with id: ${req.user._id}`);
            throw new Error({status: 400, msg: 'User already exists but could not be found.'});
          }

          // Parse fields from profile to existing user
          foundUser.github = profile.login;
          foundUser.picture = foundUser.picture || profile.avatar_url;
          foundUser.displayName = foundUser.displayName || profile.name;
          foundUser.name = foundUser.displayName;
          foundUser.email = foundUser.email;
          logger.verbose('user linked to github.');
          return foundUser.save();
        });
      });
    }

    // Update the user's admin status.
    static updateUsersGroup(user, groupname) {
      logger.debug('updating user\'s group to match current status.');
      return Group.findOne({users: user, name: 'admins'})
          .catch((error) => {
            logger.error(error);
            throw error;
          })
          .then((group) => {
            logger.verbose('response received from database.');

            // If group was found but groupname is not admins, remove user from admins
            if (group && groupname !== 'admins') {
              logger.info(`removing user: ${user._id} from admins.`);
              return user.removeFromGroup('admins');
            } else if (!group && groupname === 'admins') {
              logger.info(`adding user: ${user._id} to admins.`);
              return user.addToGroup('admins');
            } else {
              logger.verbose(`user is in the correct group: ${groupname}.`);
            }
          });
    }
}

module.exports = Github;
