// internal modules
const fs = require('fs');

// 3rd party modules
const _ = require('lodash');
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
        if ( file.match(/\.js$/) &&
            !file.match(/^index\.js$/) &&
            !file.match(/^\./)) {
            try {
                let filename = `${__dirname}/${file}`;
                logger.silly(`Reading: ${filename}`);
                let model = require(filename);
                if(_.get(model,'Collection') && _.isString(model.Collection)) {
                  if(!_.has(models, model.Collection)) {
                      models[model.Collection] = model.Model;
                      logger.verbose(' * '+model.Collection);
                  } else {
                      logger.error("Two models registered to same collection!")
                  }
                } else {
                    console.log(model);
                }
            } catch(err){
                logger.warn(err);
            }
        }
    });
}
module.exports.registerModels = registerModels;
