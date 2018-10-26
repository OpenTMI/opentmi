const sinon = require('sinon');

module.exports.newResponse = () => {
  const res = {
    status: sinon.stub(),
    json: sinon.stub()
  };
  res.status.returns(res);
  res.json.returns(res);
  return res;
};
module.exports.newRequest = (body = {}, params = {}, query = {}) => ({body, params, query});

