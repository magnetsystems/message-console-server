var Sequelize = require('sequelize')
, MMXManager = require('../lib/MMXManager')
, fs = require('fs')
, redis = require('redis');

var configPath = './lib/config/config.json';
var REDIS_ID = 'messaging-config';

var ConfigManager = function(){
    this.configs = this.retrieveLocal();
    this.cachedTime = 0;
    return this;
};

ConfigManager.prototype.init = function(cb){
    var me = this;
    if(me.configs.Redis.enabled){
        connectRedis(me.configs.Redis, function(e, client){
            if(e) return cb(e);
            me.redis = client;
            me.setConfigsIfNotExist(function(e){
                if(e) return cb(e);
                me.storeLocal(function(e){
                    if(e) return cb(e);
                    me.cachedTime = Date.now();
                    cb();
                });
            });
        });
    }else{
        cb();
    }
};

ConfigManager.prototype.get = function(feature, cb, useCache){
    var me = this;
    if(me.redis && (!useCache || ((Date.now() - me.cachedTime)) > ((me.configs.Redis.cacheTimeout || 60) * 1000))){
        me.redis.get(REDIS_ID, function(e, res){
            if(e){
                winston.error('Config: error retrieving config from Redis, falling back to retrieval from memory. error message: ', e);
                return cb(null, feature ? me.configs[feature] : me.configs);
            }
            winston.verbose('Config: retrieved config feature "'+(feature || 'all')+'" from Redis.');
            me.configs = JSON.parse(res);
            me.storeLocal(function(e){
                if(e) return cb(e);
                me.cachedTime = Date.now();
                cb(null, feature ? me.configs[feature] : me.configs);
            });
        });
    }else{
        cb(null, feature ? me.configs[feature] : me.configs);
    }
};

ConfigManager.prototype.retrieveLocal = function(){
    var obj;
    try{
        obj = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        winston.info('Config: loaded configuration from file: '+configPath);
    }catch(e){
        winston.error('Config: error loading configuration from file '+configPath+': ', e);
        throw(e);
    }
    return obj;
};

ConfigManager.prototype.set = function(feature, obj, cb){
    var me = this, errors = [], key;
    if(!me.configs[feature]){
        winston.error('Config: feature not found: '+feature);
        return cb('invalid-feature');
    }
    for(key in obj){
        if(typeof me.configs[feature][key] !== 'undefined'){
            if(typeof me.configs[feature][key] !== typeof obj[key] && me.configs[feature][key] !== null && obj[key] !== null){
                errors.push(key);
            }
        }
    }
    if(errors.length){
        winston.error('Config: error setting configuration: invalid data types - ', errors);
        return cb(errors);
    }
    for(key in obj){
        if(typeof me.configs[feature][key] !== 'undefined'){
            me.configs[feature][key] = obj[key];
        }
    }
    me.storeLocal(function(e){
        if(e) return cb(e);
        if(me.redis) return me.redis.set(REDIS_ID, JSON.stringify(me.configs), cb);
        cb();
    });
};

ConfigManager.prototype.storeLocal = function(cb){
    var me = this;
    fs.writeFile(configPath, JSON.stringify(this.configs, undefined, 4), function(e){
        if(e){
            winston.error('Config: error saving configuration: ', e);
            return cb('save-error');
        }
        ENV_CONFIG = me.configs;
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
    var me = this;
    if(!obj.email || !obj.password){
        winston.error('Config: unable to create admin user: missing required fields');
        return cb('missing-fields');
    }
    obj.activated = true;
    obj.userType = 'admin';
    require('./UserManager').create(obj, function(e){
        if(e) return cb(e);
        me.set('EmailAlerts', {
            recipient : obj.email
        }, function(e){
            if(e) return cb(e);
            winston.info('Config: successfully created an admin user.');
            cb();
        });
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
            'mysqlHost'      : !obj.shareDB ? obj['mysqlHost'] : me.configs.Database.host,
            'mysqlPort'      : !obj.shareDB ? obj['mysqlPort'] : me.configs.Database.port,
            'mysqlDb'        : !obj.shareDB ? obj['mysqlDb'] : me.configs.Database.dbName,
            'mysqlUser'      : !obj.shareDB ? obj['mysqlUser'] : me.configs.Database.username,
            'mysqlPassword'  : !obj.shareDB ? obj['mysqlPassword'] || me.configs.Database.password : me.configs.Database.password,
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
    var cfg = me.configs.MMX;
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
                return MMXManager.setConfigs({
                    configs : obj.mmxconfig
                }, function(e){
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
    if(obj.enabled){
        connectRedis(obj, function(e, client){
            if(e){
                winston.error('Config: unable to connect to Redis database: ', e);
                return cb('connect-error');
            }
            me.redis = client;
            me.set('Redis', obj, function(e){
                if(e){
                    winston.error('Config: unable to store Redis config: ', e);
                    return cb('connect-error');
                }
                winston.info('Config: successfully configured Redis.');
                me.setConfigsIfNotExist(cb);
            });
        });
    }else{
        me.set('Redis', obj, function(e){
            if(e){
                winston.error('Config: unable to store Redis config: ', e);
                return cb('connect-error');
            }
            winston.info('Config: successfully configured Redis.');
            cb();
        });
    }
};

ConfigManager.prototype.setConfigsIfNotExist = function(cb){
    var me = this;
    me.redis.get(REDIS_ID, function(e, res){
        if(e)
            return cb(e);
        if(!res)
            return me.redis.set(REDIS_ID, JSON.stringify(me.configs), cb);
        me.configs = JSON.parse(res);
        cb();
    });
};

// more granular version
//
//function setConfigsIfNotExist(client, cb){
//    var objAry = [];
//    for(var key in me.configs){
//        objAry.push({
//            key  : key,
//            vals : me.configs[key]
//        });
//    }
//    function loop(ary, i){
//        if(i >= ary.length)
//            return cb();
//        client.get(REDIS_ID+':' + ary[i].key, function(e, res){
//            if(res == null){
//                client.set(REDIS_ID+':' + ary[i].key, JSON.stringify(ary[i].vals), function(e, res){
//                    loop(ary, ++i);
//                });
//            }else{
//                me.configs[ary[i].key] = JSON.parse(res);
//                loop(ary, ++i);
//            }
//        });
//    }
//    loop(objAry, 0);
//}

function connectRedis(obj, cb){
    if(obj.enabled === false) return cb();
    var client = redis.createClient(obj.port, obj.host);
    if(obj.pass) client.auth(obj.pass);
    client.on('error', function(e){
        winston.error('Config: unable to connect to Redis database: connection error');
        cb('connect-error');
    });
    client.on('connect', function(err){
        winston.info('Config: connected to Redis database.');
        cb(null, client);
    });
    client.get('redis-init', function(e, reply){
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
ConfigManager.prototype.getConfigs = function(cb){
    var me = this, cfg = {};
    me.get(null, function(e, configs){
        if(e) return cb(e);
        for(var section in configs){
            cfg[section] = {};
            for(var item in configs[section]){
                if(!isPrivate(item)) cfg[section][item] = configs[section][item];
            }
        }
        cb(null, cfg);
    }, true);
};

ConfigManager.prototype.getConfig = function(section, cb){
    var me = this, cfg = {};
    if(!me.configs[section]) return cb('invalid-section');
    me.get(section, function(e, feature){
        if(e) return cb(e);
        for(var item in feature){
            if(!isPrivate(item)) cfg[item] = feature[item];
        }
        cb(null, cfg);
    }, true);
};

ConfigManager.prototype.setConfig = function(section, configs, cb){
    var me = this;
    if(!me.configs[section]) return cb('invalid-section');
    if(section == 'Database') return me.setDB(configs, cb);
    if(section == 'MMX') return me.setMessaging(configs, cb);
    if(section == 'Redis') return me.setRedis(configs, cb);
    if(section == 'Email') require('./EmailService').setServer();
    me.set(section, configs, function(e){
        if(e) return cb(e);
        if(['EmailAlerts', 'DatabaseLog', 'FileLog', 'ConsoleLog'].indexOf(section) != -1)
            require('../lib/LogManager').setHandler(section);
        winston.info('Config: successfully configured section "'+section+'" of config.');
        cb();
    });
};

function isPrivate(key){
    return key.toLowerCase().indexOf('pass') !== -1 || key.toLowerCase().indexOf('secret') !== -1;
}

module.exports = new ConfigManager();