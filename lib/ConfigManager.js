var Sequelize = require('sequelize')
, MMXManager = require('../lib/MMXManager')
, fs = require('fs')
, redis = require('redis')
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

ConfigManager.prototype.set = function(feature, obj, cb){
    var errors = [];
    if(!ENV_CONFIG[feature]){
        winston.error('Config: feature not found: '+feature);
        return cb('invalid-feature');
    }
    for(var key in obj){
        if(typeof ENV_CONFIG[feature][key] !== 'undefined'){
            if(typeof ENV_CONFIG[feature][key] !== typeof obj[key] && ENV_CONFIG[feature][key] !== null && obj[key] !== null){
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

/* WIZARD */

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
    if(!obj.email || !obj.password){
        winston.error('Config: unable to create admin user: missing required fields');
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

ConfigManager.prototype.bootstrapMessaging = function(obj, cb){
    var me = this;
    if(!obj.host || !obj.user || !obj.password || !obj.port || typeof obj.shareDB === 'undefined'){
        winston.error('Config: unable to connect to messaging server: missing required fields');
        return cb('missing-fields');
    }
    if(obj.skipProvisioning){
        me.set('MMX', obj, function(e){
            if(e) return cb(e);
            winston.info('Config: successfully configured an existing messaging server.');
            cb();
        });
    }else{
        MMXManager.provisionServer(obj, {
            'mysqlHost'      : !obj.shareDB ? obj['mysqlHost'] : ENV_CONFIG.Database.host,
            'mysqlPort'      : !obj.shareDB ? obj['mysqlPort'] : ENV_CONFIG.Database.port,
            'mysqlDb'        : !obj.shareDB ? obj['mysqlDb'] : ENV_CONFIG.Database.dbName,
            'mysqlUser'      : !obj.shareDB ? obj['mysqlUser'] : ENV_CONFIG.Database.username,
            'mysqlPassword'  : !obj.shareDB ? obj['mysqlPassword'] || ENV_CONFIG.Database.password : ENV_CONFIG.Database.password,
            'xmppDomain'     : obj.xmppDomain || 'localhost',
            'xmppPort'       : obj.xmppPort || 5222,
            'xmppSecurePort' : obj.xmppSecurePort || 5223,
            'httpPort'       : obj.port || 9090,
            'httpsPort'      : obj.httpsPort || 9091
        }, function(e, status, code){
            if(code == 200){
                MMXManager.getServerStatus(obj, function(e, status, code){
                    if(code == 401 || code == 403) return cb('auth-failure');
                    if(code == 200) return cb('already-configured');
                    return cb(status);
                });
            }else if(code == 201){
                me.set('MMX', obj, function(e){
                    if(e) return cb(e);
                    winston.info('Config: successfully configured a new messaging server.');
                    cb();
                });
            }else{
                return cb(status);
            }

        });
    }
};

ConfigManager.prototype.setMessaging = function(obj, cb){
    var me = this;
    var cfg = ENV_CONFIG.MMX;
    var connect = {
        host     : obj.host || cfg.host,
        port     : obj.port || cfg.port,
        user     : obj.user || cfg.user,
        password : obj.password || cfg.password,
        ssl      : cfg.ssl
    };
    MMXManager.getServerStatus(connect, function(e, status, code){
        if(code == 401 || code == 403) return cb('auth-failure');
        if(code != 200) return cb(e);
        me.set('MMX', connect, function(e){
            if(e) return cb(e);
            winston.info('Config: successfully configured messaging server connectivity to "'+obj.host+':'+obj.port+'".');
            if(obj.mmxconfig){
                return MMXManager.setConfigs(obj.mmxconfig, function(e){
                    if(e) return cb(e);
                    winston.info('Config: successfully configured messaging server properties.');
                    cb();
                });
            }
            cb();
        });
    });
};

ConfigManager.prototype.setRedis = function(obj, cb){
    var me = this;
    if(!obj.host || !obj.port){
        winston.error('Config: unable to connect to Redis database: missing required fields');
        return cb('missing-fields');
    }
    testRedis(obj, function(e){
        if(e) return cb('connect-error');
        me.set('Redis', obj, function(e){
            if(e) return cb(e);
            winston.info('Config: successfully configured the Redis database.');
            cb();
        });
    });
};

function testRedis(obj, cb){
    if(obj.enabled === false) return cb();
    var redisClient = redis.createClient(obj.port, obj.host);
    if(obj.pass) redisClient.auth(obj.pass);
    redisClient.on('error', function(e){
        winston.error('Config: unable to connect to Redis database: connection error');
        cb('connect-error');
    });
    redisClient.on('connect', function(err){
        winston.info('Config: connected to Redis database.');
        cb();
    });
    redisClient.get('redis-init', function(e, reply){
        if(typeof e === 'undefined') cb();
    });
}

ConfigManager.prototype.completeInstall = function(cb){
    this.set('App', {
        configured : true
    }, function(e){
        if(e) return cb(e);
        winston.info('Config: successfully completed the installation.');
        cb();
    });
};

/* CONFIG */
ConfigManager.prototype.getConfigs = function(){
    var cfg = {};
    for(var section in ENV_CONFIG){
        cfg[section] = {};
        for(var item in ENV_CONFIG[section]){
            if(!isPrivate(item)) cfg[section][item] = ENV_CONFIG[section][item];
        }
    }
    return cfg;
};

ConfigManager.prototype.getConfig = function(section, cb){
    var cfg = {};
    if(!ENV_CONFIG[section]) return cb('invalid-section');
    for(var item in ENV_CONFIG[section]){
        if(!isPrivate(item)) cfg[item] = ENV_CONFIG[section][item];
    }
    cb(null, cfg);
};

ConfigManager.prototype.setConfig = function(section, configs, cb){
    var me = this;
    if(!ENV_CONFIG[section]) return cb('invalid-section');
    if(section == 'Database') return me.setDB(configs, cb);
    if(section == 'MMX') return me.setMessaging(configs, cb);
    if(section == 'Redis') return me.setRedis(configs, cb);
    this.set(section, configs, function(e){
        if(e) return cb(e);
        winston.info('Config: successfully configured section "'+section+'" of config.');
        cb();
    });
};

function isPrivate(key){
    return key.toLowerCase().indexOf('pass') !== -1 || key.toLowerCase().indexOf('secret') !== -1;
}



module.exports = new ConfigManager();