// 3rd party modules
const request = require('request-promise');
const mongoose = require('mongoose');
const _ = require('lodash');

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
    static checkOrganization(oauth2, accessToken) {
      logger.debug('fetching list of organizations user belongs to.');

      logger.verbose('requesting organization information.');
      const orgUrl = `${userApiUrl}/orgs`;
      return new Promise((resolve, reject) => {
        oauth2.get(orgUrl, accessToken, function (err, body, res) {
          if (err) {
            return reject(new Error('Failed to fetch user profile', err));
          }
          try {
            return resolve(JSON.parse(body));
          } catch (ex) {
            return reject(new Error('Failed to parse user profile'));
          }
        });
      })
        .then((org) => {
          // Attempt to find the defined organization from a list of the users organizations
            const belongsOrg = _.find(org, {login: githubOrganization});
            if (!belongsOrg) {
              logger.warn(`user not in ${githubOrganization} organization.`);
              throw new Error({status: 401, msg: `You do not have required access to ${githubOrganization}.`});
            }
            logger.verbose('user belongs to '
            + `organization: ${githubOrganization}, which has access to this server.`);
            return belongsOrg;
        });
    };

    // Check if the user is an administrator or a normal employee in the organization.
    static checkAdmin(oauth2, accessToken) {
      logger.debug('checking if the user is in the administrator team.');

      logger.verbose('requesting list of teams where user is a member.');
      const teamUrl = `${userApiUrl}/teams`;
      return new Promise((resolve, reject) => {
        oauth2.get(teamUrl, accessToken, function (err, body, res) {
          if (err) {
            return reject(new Error('Failed to fetch user profile', err));
          }
          try {
            return resolve(JSON.parse(body));
          } catch (ex) {
            return reject(new Error('Failed to parse user profile'));
          }
        });
      })
        .then((teams) => {
          logger.verbose(`response from: ${teamUrl} received`);
          // Attempt to find the correct admin team from list of teams the user belongs to
          const isAdmin = _.find(teams, team =>
            (team.name === githubAdminTeam && team.organization.login === githubOrganization));
          logger.verbose(`user belongs to group ${githubOrganization}`);
          return isAdmin;
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

            // If group was found but groupname is not admins, remove user from admins
            if (group && groupname !== 'admins') {
              logger.info(`removing user: ${user._id} from admins.`);
              return user.removeFromGroup('admins');
            } else if (!group && groupname === 'admins') {
              logger.info(`adding user: ${user._id} to admins.`);
              return user.addToGroup(groupname);
            } else {
              logger.verbose(`user is in the correct group: ${groupname}.`);
              return user.save();
            }
          });
    }
}

module.exports = Github;
