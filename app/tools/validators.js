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
      minProperties: 0
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
        '.+': { // key is application name
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

const META_DATA = {
  type: 'object',
  properties: {
    meta_data: {
      type: 'object',
      patternProperties: {
        '.+': {type: 'string'}
      },
      minProperties: 0
    }
  },
  additionalProperties: false,
  required: ['meta_data']
};

function wrapValidator(schema, key) {
  return (value) => {
    const validator = tv4.freshApi();
    const input = {};
    input[key] = value;
    const result = validator.validateResult(input, schema);
    return result.valid;
  };
}


module.exports.tagsValidator = wrapValidator(TAGS, 'tags');
module.exports.appsValidator = wrapValidator(APPS, 'apps');
module.exports.metaValidator = wrapValidator(META_DATA, 'meta_data');
