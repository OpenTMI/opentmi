// 3rd party modules
const mongoose = require('mongoose');
const _ = require('lodash');

// application modules
const logger = require('../../tools/logger');
const nconf = require('../../tools/config');

// implementation
const User = mongoose.model('User');

const userApiUrl = 'https://api.github.com/user';


class Github {
  static createUserFromGithubProfile(profile) {
    logger.silly(`create new user from github profile: ${profile.username}`);
    const newUser = new User();
    newUser.name = profile.displayName;
    newUser.github = profile._json.username;
    newUser.picture = profile._json.avatar_url;
    newUser.displayName = profile.displayName;
    newUser.email = profile._json.email;
    return newUser.save();
  }
  // Ensure the user belongs to the required organization.
  static checkOrganization(oauth2, accessToken) {
    logger.debug('fetching list of organizations user belongs to.');
    const {organization} = nconf.get('github');
    if (!organization) {
      logger.warn('github organization is not configured - assuming anybody can login');
      return Promise.resolve();
    }
    logger.verbose('requesting organization information.');
    const orgUrl = `${userApiUrl}/orgs`;
    return new Promise((resolve, reject) => {
      oauth2.get(orgUrl, accessToken, (error, body, res) => {
        if (error) {
          let message = 'cannot read organization';
          try {
            const json = JSON.parse(error.data);
            message = json.message || message;
          } catch (parseError) {
            logger.debug('json parse error: ', parseError);
          }
          const err = new Error(message);
          err.statusCode = error.statusCode || 500;
          return reject(err);
        }
        try {
          logger.silly(`${orgUrl} - statusCode: ${res.statusCode}`);
          return resolve(JSON.parse(body));
        } catch (parseError) {
          return reject(new Error(`Failed to parse user profile: ${parseError}`));
        }
      });
    })
      .then((org) => {
        // Attempt to find the defined organization from a list of the users organizations
        const belongsOrg = _.find(org, {login: organization});
        if (!belongsOrg) {
          logger.warn(`user not in ${organization} organization.`);
          throw new Error(`You do not have required access to ${organization}.`);
        }
        logger.verbose('user belongs to '
            + `organization: ${organization} - OK`);
        return belongsOrg;
      });
  }

  // Check if the user is an administrator or a normal employee in the organization.
  static checkAdmin(oauth2, accessToken) {
    logger.debug('checking if the user is in the administrator team.');

    logger.verbose('requesting list of teams where user is a member.');
    const teamUrl = `${userApiUrl}/teams`;
    return new Promise((resolve, reject) => {
      oauth2.get(teamUrl, accessToken, (err, body, res) => {
        if (err) {
          return reject(new Error(`Failed to fetch teams: ${teamUrl} ${err}`));
        }
        try {
          logger.silly(`${teamUrl} - statusCode: ${res.statusCode}`);
          return resolve(JSON.parse(body));
        } catch (ex) {
          return reject(new Error('Failed to parse user profile'));
        }
      });
    })
      .then((teams) => {
        logger.verbose(`response from: ${teamUrl} received - OK`);
        const {adminTeam, organization} = nconf.get('github');

        // Attempt to find the correct admin team from list of teams the user belongs to
        const isAdmin = _.find(teams, team =>
          (team.name === adminTeam && team.organization.login === organization));
        logger.verbose(`user ${isAdmin ? 'belongs' : 'does not belong'} to admin team: ${adminTeam}`);
        return !!isAdmin;
      });
  }

  // Update the user's admin status.
  static updateUsersGroup(user, groupname) {
    logger.debug('updating user\'s group to match current status.');
    if (groupname !== 'admins') {
      logger.info(`removing user: ${user._id} from admins.`);
      return user.isAdmin()
        .then((isAdmin) => {
          if (isAdmin) {
            return user.removeFromGroup('admins');
          }
          return user.save();
        });
    } else if (groupname === 'admins') {
      logger.info(`adding user: ${user._id} to admins.`);
      return user.addToGroup(groupname);
    }
    logger.verbose(`user is in the correct group: ${groupname}.`);
    return user.save();
  }
}

module.exports = Github;
