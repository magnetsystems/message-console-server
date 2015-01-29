var Sequelize = require('sequelize')
, fs = require('fs')
, configPath = './lib/config/config.json';

var ConfigManager = function(){
    this.configs = this.retrieve();
    return this;
};

ConfigManager.prototype.get = function(){
    return this.configs;
};

ConfigManager.prototype.retrieve = function(){
    var obj;
    try{
        obj = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        winston.info('Config: loaded configuration from: '+configPath);
    }catch(e){
        winston.error('Config: error loading configuration from "'+configPath+'": ', e);
        throw(e);
    }
    return obj;
};

ConfigManager.prototype.setDB = function(obj, cb){
    var me = this;
    if(!obj.dbName || !obj.username || !obj.host || !obj.port){
        winston.error('ORM: unable to connect to database: missing required fields');
        return cb('connect-error');
    }
    var sequelize = new Sequelize(
        obj.dbName,
        obj.username,
        obj.password,
        {
            host    : obj.host,
            port    : obj.port,
            logging : winston.verbose,
            define  : {
                charset : 'utf8'
            }
        }
    );
    sequelize.authenticate().complete(function(e){
        if(e){
            winston.error('ORM: unable to connect to database: ', e);
            return cb('connect-error');
        }
        me.set('Database', obj, function(e){
            if(e) return cb(e);
            cb();
        });
    });
};

ConfigManager.prototype.setAdmin = function(obj, cb){
    if(!obj.username || !obj.email || !obj.password){
        winston.error('System: unable to create admin user: missing required fields');
        return cb('missing-fields');
    }
    obj.activated = true;
    obj.userType = 'admin';
    require('./UserManager').create(obj, function(e){
        if(e) return cb(e);
        cb();
    });
};

ConfigManager.prototype.finishBootstrap = function(obj, cb){
    this.set('App', {
        configured : true
    }, function(e){
        if(e) return cb(e);
        cb();
    });
};

ConfigManager.prototype.set = function(feature, obj, cb){
    var errors = [];
    if(!ENV_CONFIG[feature]){
        winston.error('Config: feature not found: '+feature);
        return cb('invalid-feature');
    }
    for(var key in obj){
        if(ENV_CONFIG[feature][key]){
            if(typeof ENV_CONFIG[feature][key] !== typeof obj[key]){
                errors.push(key);
            }
        }
    }
    if(errors.length){
        winston.error('Config: error setting configuration: invalid data types - ', errors);
        return cb(errors);
    }
    this.store(function(e){
        if(e) return cb(e);
        for(var key in obj){
            if(ENV_CONFIG[feature][key]){
                ENV_CONFIG[feature][key] = obj[key];
            }
        }
        cb();
    });
};

ConfigManager.prototype.store = function(cb){
    fs.writeFile(configPath, JSON.stringify(ENV_CONFIG, undefined, 4), function(e){
        if(e){
            winston.error('Config: error saving configuration: ', e);
            return cb('save-error');
        }
        cb();
    });
};

module.exports = new ConfigManager();