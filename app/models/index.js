// internal modules
const fs = require('fs');

// 3rd party modules
const bluebird = require('bluebird');
const logger = require('winston');


let models = {};


function ensureIndexes() {
    /** @TODO create mechanism to call this in safe way
     * so we do not close db connection before the process is completed
     */
    logger.info("Start ensuring models indexes..");
    let pending = [];
    let ensureModelIndexes = (Model) => {
        return new Promise( (resolve, reject) => {
            Model.ensureIndexes( (err) => {
               if(err) reject(err);
               else resolve();
            });
        });
    };
    _.each(models, (Model, collection) => {
        pending.push(ensureModelIndexes(Model));
    });
    return Promise.all(pending).then( () => {
        logger.info("Ensuring ready.");
    }).catch( (err) => {
        logger.info(`Ensuring fails: ${err}`);
        throw err;
    });
}

function registerModels(app) {
    logger.info("Register models..");
    fs.readdirSync(__dirname).forEach((file) =>{
        if (!file.match(/index\.js$/) &&
             file.match(/\.js$/) &&
            !file.match(/^\./)) {
            logger.verbose(' * '+file);
            let model = require(`${__dirname}/${file}`);
            if(model.Collection) {
              models[model.Collection] = model.Model;
            }
        }
    });
}
module.exports.registerModels = registerModels;
