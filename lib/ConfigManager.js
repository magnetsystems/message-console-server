var Sequelize = require('sequelize')
, MMXManager = require('../lib/MMXManager')
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
        winston.error('Config: error loading configuration from '+configPath+': ', e);
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
    obj.password = (obj.password && obj.password.trim().length) ? obj.password : null;
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
            winston.info('Config: successfully configured database.');
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
        winston.info('Config: successfully created an admin user.');
        cb();
    });
};

ConfigManager.prototype.setMessaging = function(obj, cb){
    var me = this;
    if(!obj.host || !obj.user || !obj.password || !obj.port || typeof obj.ssl === 'undefined'){
        winston.error('System: unable to connect to messaging server: missing required fields');
        return cb('missing-fields');
    }
    MMXManager.getServerStatus(obj, function(e, status, code){
        if(e){
            if(code === 403 || code === 401) return cb('auth-failure');
            if(code === 404) return cb('not-found');
            return cb(e);
        }
//        status = {
//            "setupComplete" : false
//        };
        // TODO: should be handled by mmx
        if(typeof status.setupComplete === 'undefined') return cb('older-version');
        if(typeof status.setupComplete !== 'undefined' && status.setupComplete) return cb('already-configured');
        var mmxConfigs = {
            'mysql.host'       : ENV_CONFIG.Database.host,
            'mysql.port'       : ENV_CONFIG.Database.port,
            'mysql.db'         : ENV_CONFIG.Database.dbName,
            'mysql.user'       : ENV_CONFIG.Database.username,
            'mysql.password'   : ENV_CONFIG.Database.password,
            'xmpp.domain'      : obj.xmppDomain || 'localhost',
            'xmpp.port'        : obj.xmppPort || 5222,
            'xmpp.secure.port' : obj.xmppSecurePort || 5223,
            'http.port'        : obj.port || 9090,
            'https.port'       : obj.httpsPort || 9091,
            'server.host'      : obj.host || 'localhost',
            'admin.user'       : obj.user || 'admin',
            'admin.pass'       : obj.password || 'admin'
        };
        MMXManager.provisionServer(obj, mmxConfigs, function(e, status, code){
            if(e) return cb(e);
            // TODO: should be handled by mmx
            me.set('MMX', obj, function(e){
                if(e) return cb(e);
                winston.info('Config: successfully configured the messaging server.');
                cb();
            });
        });
    });
};

ConfigManager.prototype.completeInstall = function(cb){
    this.set('App', {
        configured : true
    }, function(e){
        if(e) return cb(e);
        winston.info('Config: successfully completed the installation.');
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
        if(typeof ENV_CONFIG[feature][key] !== 'undefined'){
            if(typeof ENV_CONFIG[feature][key] !== typeof obj[key]){
                errors.push(key);
            }
        }
    }
    if(errors.length){
        winston.error('Config: error setting configuration: invalid data types - ', errors);
        return cb(errors);
    }
    for(var key in obj){
        if(typeof ENV_CONFIG[feature][key] !== 'undefined'){
            ENV_CONFIG[feature][key] = obj[key];
        }
    }
    this.store(function(e){
        if(e) return cb(e);
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