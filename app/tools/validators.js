const tv4 = require('tv4');

const TAGS = {
  type: 'object',
  properties: {
    tags: {
      type: 'object',
      patternProperties: {
        '.+': {
          enum: [true, false, null]
        }
      },
      minProperties: 1
    }
  },
  additionalProperties: false,
  required: ['tags']
};

const APPS = {
  type: 'object',
  properties: {
    apps: {
      type: 'object',
      patternProperties: {
        '.+': {
          type: 'object',
          properties: {
            version: {type: 'string'},
            tag: {type: 'string'},
            commit_id: {type: 'string'},
            release_notes_url: {type: 'string'},
            build_url: {type: 'string'}
          }
        }
      }
    }
  },
  additionalProperties: false,
  required: ['apps']
};

function wrapValidator(schema) {
  return (value) => {
    const validator = tv4.freshApi();
    const result = validator.validateResult(value, schema);
    return result.valid;
  };
}


module.exports.tagsValidator = wrapValidator(TAGS);
module.exports.appsValidator = wrapValidator(APPS);
