/*!
 * Module dependencies
 */
// native modules
var fs = require('fs');
var path = require('path');

// 3rd party modules
var logger = require('winston');
var _ = require('lodash');
var uuid = require('node-uuid');
var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');
var mime = require('mime');

var tools = require('../tools');
var checksum = tools.checksum;
var filedb = tools.filedb;
var file_provider = filedb.provider;
var FileSchema = require('./file');

var Schema = mongoose.Schema;


/**
 * Location schema
 */
var Location = new Schema({
    url: {type: String}, // fs://... or http://... or ftp://... or sft://...
    auth: {
        usr: {type: String},
        pwd: {type: String}
    }
});

/**
 * Issue schema
 */
var Issue = new Schema({
    time: {type: Date, default: Date.now},
    type: {type: String, enum: ['github', 'jira']},
    url: {type: String}
});

/**
 * Build schema
 */
var BuildSchema = new Schema({
    name: {type: String, required: true},
    type: {type: String, enum: ['app', 'lib', 'test'], default: 'app'},
    cre: {
        user: {type: String},
        time: {type: Date, default: Date.now},
        host: {type: String}
    },
    mod: {
        user: {type: String},
        time: {type: Date, default: Date.now}
    },
    uuid: {type: String, default: uuid.v4, index: true},
    vcs: [
        new Schema({
            name: {type: String}, //e.g. "github"
            system: {type: String, enum: ['git', 'SVN', 'CSV'], default: 'git'},
            type: {type: String, enum: ['PR']},
            commitId: {type: String},
            branch: {type: String},
            base_branch: {type: String},
            base_commit: {type: String},
            pr_number: {type: String},
            url: {type: String},
            clean_wa: {type: Boolean}
        })
    ],
    ci: {
        system: {type: String, enum: ['Jenkins', 'travisCI', 'circleCI']},
        location: Location,
        job: {
            name: {type: String},
            number: {type: String}
        }
    },
    compiledBy: {type: String, enum: ['CI', 'manual']},
    changeId: {type: String}, // e.g. when gerrit build
    configuration: {
        name: {type: String},
        compiler: {
            name: {type: String},
            version: {type: String},
            macros: [{
                key: {type: String},
                value: {type: String}
            }],
            flags: [{
                key: {type: String},
                value: {type: String}
            }]
        },
        linker: {
            name: {type: String},
            version: {type: String},
            flags: [{
                key: {type: String},
                value: {type: String}
            }]
        },
        toolchain: {
            name: {type: String},
            version: {type: String}
        }
    },
    memory: {
        summary: {
            heap: {type: Number},
            static_ram: {type: Number},
            total_flash: {type: Number},
            stack: {type: Number},
            total_ram: {type: Number}
        }
    },
    files: [ FileSchema ],
    issues: [Issue],
    // build target device
    target: {
        type: {type: String, enum: ['simulate', 'hardware'], default: 'hardware', required: true},
        os: {type: String, enum: ['win32', 'win64', 'unix32', 'unix64', 'mbedOS', 'unknown']},
        simulator: {
            bt: {type: String},
            network: {type: String}
        },
        hw: {
            vendor: {type: String},
            model: {type: String},
            rev: {type: String},
            meta: {type: String}
        }
    }
});
BuildSchema.set('toObject', {virtuals: true});
//BuildSchema.set('toJSON', { virtuals: true });


/**
 * Build plugin
 */
BuildSchema.plugin(QueryPlugin); //install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/*
 BuildSchema.path('location').validate(function (value, respond) {
 if( value.length === 0 ) respond(false);
 else  respond(true);
 }, '{PATH} missing');
 */


BuildSchema.pre('validate', function (next) {
    var err;
    if (_.isArray(this.files)) {
        for (i = 0; i < this.files.length; i++) {
            var file = this.files[i];
     
            file.prepareDataForStorage();
            if (file_provider === 'mongodb') {
                //use mongodb document
                logger.warn('storing file %s to mongodb', file.name);
            } else if (file_provider) {
                // store data to filesystem
                logger.debug('storing file %s into filesystem', file.name);
                file.storeInfileDB();

                // stored data seperately, unassign data from schema
                file.data = undefined;
            } else {
                //do not store at all..
                logger.warn('filedb is not configured, ignoring data');
                file.data = undefined;
            }
        }
    }
    if (err) {
        return next(err);
    }
    if (_.get(this, 'target.type') === 'simulate') {
        if (!_.get(this, 'target.simulator'))
            err = new Error('simulator missing');
    } else if (_.get(this, 'target.type') === 'hardware') {
        if (!_.get(this, 'target.hw'))
            err = new Error('target.hw missing');
        else if (!_.get(this, 'target.hw.model'))
            err = new Error('target.hw.model missing');
    }
    next(err);
});

/**
 * Methods
 */
BuildSchema.methods.download = function (index, expressResponse) {
    index = index || 0;
    var cb = function (err, file) {
        var res = expressResponse;
        if (err) {
            return res.status(500).json(err);
        }
        if (file.data) {
            var mimetype = mime.lookup(file.name);
            res.writeHead(200, {
                'Content-Type': mimetype,
                'Content-disposition': 'attachment;filename=' + file.name,
                'Content-Length': file.data.length
            });
            res.send(file.data);
        } else {
            res.status(404).json(build);
        }
    };
    if (_.get(this.files, index)) {
        var file = _.get(this.files, index);
        if (file.data) {
            return cb(null, file);
        }
        filedb.readFile(file, cb);
    } else {
        cb({error: 'file not found'});
    }
};

BuildSchema.virtual('file').get(
    function () {
        if (this.files.length === 1) {
            var href;
            if (file_provider && file_provider !== 'mongodb' && this.files[0].sha1) {
                href = path.join(file_provider, this.files[0].sha1);
            }
        }
        return href;
    });

/**
 * Statics
 */
//BuildSchema.static({});

/**
 * Register
 */
mongoose.model('Build', BuildSchema);
