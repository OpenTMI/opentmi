var jwt = require('jwt-simple');
var moment = require('moment');
var nconf = require('nconf');
var TOKEN_SECRET = nconf.get('webtoken');
/*
 |--------------------------------------------------------------------------
 | Login Required Middleware
 |--------------------------------------------------------------------------
 */
module.exports.ensureAuthenticated = function(req, res, next) {
  console.log('ensureAuthentication');
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
  }
  var token = req.headers.authorization.split(' ')[1];

  var payload = null;
  try {
    payload = jwt.decode(token, TOKEN_SECRET);
  }
  catch (err) {
    return res.status(401).send({ message: err.message });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ message: 'Token has expired' });
  }
  req.user = payload.sub;
  next();
}

/*
 |--------------------------------------------------------------------------
 | Generate JSON Web Token
 |--------------------------------------------------------------------------
 */
module.exports.createJWT = function(user) {
  console.log('createJWT token');
  var payload = {
    sub: user._id,
    iat: moment().unix(),
    exp: moment().add(14, 'days').unix()
  };
  return jwt.encode(payload, TOKEN_SECRET);
}