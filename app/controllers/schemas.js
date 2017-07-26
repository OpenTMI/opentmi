/**
  Schema Controller
*/

// Third party components
const mongoose = require('mongoose');

/**
 * Controller for *schemas* route. Keeps track of all loaded models and serves their names
 * and schemas.
 */
class SchemasController {
  /**
   * Fetches all the models that have been loaded to mongoose.
   * Caches a list of the model names, and a trimmed lookup object for model schemas
   */
  constructor() {
    this.models = mongoose.models;

    this.schemaNames = Object.keys(this.models);
    this.schemas = {};
    this.schemaNames.forEach((collection) => {
      const schema = this.models[collection].schema.obj;
      this.schemas[collection] = SchemasController._trimSchemaObj(schema);
    });
  }

  /**
   * Automatic handler for request parameter: *Collection*.
   * Fetches relevant Schema and appends it to the request with key: *Schema*.
   * @param {*} req - express request object
   * @param {*} res - express response object
   * @param {Function} next - function to execute after a collection has been found
   * @param {String} collectionName - name of the collection that is affected
   */
  paramCollection(req, res, next, collectionName) {
    const schema = this.schemas[collectionName];

    if (schema) {
      req.Schema = schema;
      return next();
    }

    return res.status(404).send(`No schema found with name: ${collectionName}`);
  }

  /**
   * Returns a list of all the modelnames that have been loaded.
   * @param {*} req - express request object
   * @param {*} res - express response object
   */
  get(req, res) {
    res.status(200).json(this.schemaNames);
  }

  /**
   * Returns the schema of a specific collection.
   * Should only be run after paramCollection.
   * @param {*} req - express request object
   * @param {*} res - express response object
   */
  static find(req, res) {
    const responsePackage = {
      collection: req.params.Collection,
      schema: req.Schema,
      properties: Object.keys(req.Schema)
    };

    res.status(200).json(responsePackage);
  }

  /**
   * Recursively goes through the schema and omits extra keys from nested schemas
   * @param {Object} schemaObj - object notation of the schema to clean up
   */
  static _trimSchemaObj(schemaObj) {
    const schemaPart = schemaObj;

    // I wish to use for loops, they work just fine
    for (const key in schemaPart) { // eslint-disable-line no-restricted-syntax
      if (Object.prototype.hasOwnProperty.call(schemaPart, key)) {
        const currentObj = schemaPart[key];
        if (key === '0' && currentObj.obj) {
          return {0: SchemasController._trimSchemaObj(currentObj.obj)};
        }

        if (typeof currentObj === 'object') {
          schemaPart[key] = SchemasController._trimSchemaObj(currentObj);
        }

        if (typeof currentObj === 'function') {
          schemaPart[key] = currentObj.name;
        }
      }
    }

    return schemaObj;
  }
}


module.exports = SchemasController;
