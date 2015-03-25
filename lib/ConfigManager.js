var Sequelize = require('sequelize')
, MMXManager = require('../lib/MMXManager')
, fs = require('fs')
, mysql = require('mysql')
, _ = require('underscore')
, redis = require('redis');

var configPath = './lib/config/config.json';
var mmxMySQLConfigPath = './lib/config/mmx-config.json';
var autologinConfigPath = './lib/config/auth.json';
var mmxStartupPropertiesPath = '../startup.properties';
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
    if(me.redis && (!useCache || (!me.configs.Redis.cacheTimeout || me.configs.Redis.cacheTimeout === 0) || ((Date.now() - me.cachedTime)) > ((me.configs.Redis.cacheTimeout || 60) * 1000))){
        me.redis.get(REDIS_ID, function(e, res){
            if(e){
                winston.error('Config: error retrieving config from Redis, falling back to retrieval from memory. error message: ', e);
                return cb(null, feature ? me.configs[feature] : me.configs);
            }
            winston.verbose('Config: retrieved config feature "'+(feature || 'all')+'" from Redis.');
            var configs = JSON.parse(res);
            delete configs.App;
            me.configs = _.extend(me.configs, configs);
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
    if(obj.createDatabase){
        createOrUseDB(obj, function(e){
            if(e) return cb(e);
            me.initSequelize(obj, cb);
        });
    }else{
        testDB(obj, function(e){
            if(e) return cb(e);
            me.initSequelize(obj, cb);
        });
    }
};

function testDB(obj, cb){
    var connection =  mysql.createConnection({
        host     : obj.host,
        por      : obj.port,
        user     : obj.username,
        password : obj.password
    });
    connection.query('USE '+obj.dbName+';', function(e){
        if(e){
            winston.error('ORM: unable to connect to database: ', e);
            return cb(e.code);
        }
        winston.info('ORM: successfully connected to database "'+obj.dbName+'".');
        return cb('DB_ALREADY_EXISTS');
    });
}

function createOrUseDB(obj, cb){
    var connection =  mysql.createConnection({
        host     : obj.host,
        por      : obj.port,
        user     : obj.username,
        password : obj.password
    });
    connection.query('CREATE DATABASE IF NOT EXISTS '+obj.dbName+';', function(e){
        if(e) return cb(e.code);
        winston.info('ORM: successfully configured database "'+obj.dbName+'".');
        cb();
    });
}

ConfigManager.prototype.initSequelize = function(obj, cb){
    var me = this;
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
        if(e){
            require('./AccountManager').manualLogin(obj.email, obj.password, function(e){
                if(e) return cb(e);
                me.setAdminComplete(obj, cb);
            }, true);
        }else{
            me.set('EmailAlerts', {
                recipient : obj.email
            }, function(e){
                if(e) return cb(e);
                me.setAdminComplete(obj, cb);
            });
        }
    });
};

ConfigManager.prototype.setAdminComplete = function(obj, cb){
    var me = this;
    me.setAuthFile({
        email    : obj.email,
        password : obj.passwordVerify
    });
    me.set('EmailAlerts', {
        recipient : obj.email
    }, function(e){
        if(e) return cb(e);
        winston.info('Config: successfully created an admin user.');
        cb();
    });
}

ConfigManager.prototype.bootstrapMessaging = function(obj, cb){
    var me = this;
    if(!obj.host || !obj.user || !obj.password || !obj.webPort || typeof obj.shareDB === 'undefined'){
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
        var mmxMySQLSettings = !obj.shareDB ? {
            host     : obj['mysqlHost'],
            port     : obj['mysqlPort'],
            dbName   : obj['mysqlDb'],
            username : obj['mysqlUser'],
            password : obj['mysqlPassword']
        } : me.configs.Database;
        me.setMMXMySQL(mmxMySQLSettings, function(){});
        MMXManager.provisionServer(obj, {
            'mysqlHost'       : mmxMySQLSettings.host,
            'mysqlPort'       : mmxMySQLSettings.port,
            'mysqlDb'         : mmxMySQLSettings.dbName,
            'mysqlUser'       : mmxMySQLSettings.username,
            'mysqlPassword'   : mmxMySQLSettings.password,
            'xmppDomain'      : obj.xmppDomain || 'localhost',
            'xmppPort'        : obj.messaging_tcp || 5222,
            'xmppSecurePort'  : obj.messaging_tls || 5223,
            'httpPort'        : obj.bootstrap_http || 9090,
            'httpsPort'       : obj.bootstrap_https || 9091,
            'bootstrap_http'  : obj.webPort || 9090,
            'bootstrap_https' : obj.bootstrap_https || 9091,
            'admin_http'      : obj.adminPort || 6060,
            'admin_https'     : obj.admin_https || 6061,
            'public_http'     : obj.publicPort || 5220,
            'public_https'    : obj.public_https || 5221,
            'messaging_tcp'   : obj.messaging_tcp || 5222,
            'messaging_tls'   : obj.messaging_tls || 5223
        }, function(e, status, code){
            if(code == 200){
                MMXManager.getServerStatus(obj, function(e, status, code){
                    if(code == 401 || code == 403) return cb('auth-failure');
                    if(code == 200) return cb('already-configured');
                    return cb(status);
                }, {
                    port : obj.webPort
                });
            }else if(code == 201){
                me.set('MMX', obj, function(e){
                    if(e) return cb(e);
                    me.set('Geologging', {
                        host       : obj.host || 'localhost',
                        servername : obj.xmppDomain || 'localhost'
                    }, function(e){
                        if(e) return cb(e);
                        winston.info('Config: successfully configured a new messaging server.');
                        cb();
                    });
                });
            }else if(code == 404){
                return cb('not-found');
            }else if(code == 401 || code == 403){
                return cb('auth-failure');
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
        webPort  : obj.webPort || cfg.webPort,
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
    }, {
        port : obj.webPort
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
            winston.info('Config: successfully connected to Redis database.');
            me.setConfigsIfNotExist(function(e){
                if(e) return cb(e);
                me.set('Redis', obj, function(e){
                    if(e){
                        winston.error('Config: unable to store Redis config: ', e);
                        return cb('connect-error');
                    }
                    winston.info('Config: successfully configured Redis.');
                    cb();
                });
            });
        });
    }else{
        delete me.redis;
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

ConfigManager.prototype.setConfigsIfNotExist = function(cb, redisObj){
    var me = this;
    me.redis.get(REDIS_ID, function(e, res){
        if(e)
            return cb(e);
        if(!res)
            return me.redis.set(REDIS_ID, JSON.stringify(me.configs), cb);
        var configs = JSON.parse(res);
        delete configs.App;
        me.configs = _.extend(me.configs, configs);
        cb();
    });
};

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

ConfigManager.prototype.getMMXStartupProperties = function(cb){
    var props = {}, prop;
    fs.exists(mmxStartupPropertiesPath, function(exists){
        if(exists){
            fs.readFile(mmxStartupPropertiesPath, {encoding : 'utf-8'}, function(e, data){
                if(e){
                    winston.error('Config: error reading mmx startup properties: ', e);
                    return cb('read-error');
                }
                try{
                    data = data.split(/\r?\n/);
                    for(var key in data){
                        prop = data[key].split('=');
                        props[prop[0]] = prop[1];
                    }
                    winston.silly('Config: loaded configuration from file: '+mmxStartupPropertiesPath);
                    cb(null, props);
                }catch(e){
                    winston.error('Config: error reading mmx startup properties: ', e);
                    return cb('read-error');
                }
            });
        }else{
            cb(null, {
                'bootstrap_http'  : 9090,
                'bootstrap_https' : 9091,
                'admin_http'      : 6060,
                'admin_https'     : 6061,
                'public_http'     : 5220,
                'public_https'    : 5221,
                'messaging_tcp'   : 5222,
                'messaging_tls'   : 5223
            });
        }
    });
};

ConfigManager.prototype.getMMXMySQL = function(cb){
    fs.readFile(mmxMySQLConfigPath, {encoding : 'utf-8'}, function(e, data){
        if(e){
            winston.error('Config: error reading mmx mysql settings: ', e);
            return cb('read-error');
        }
        try{
            var obj = JSON.parse(data);
            winston.silly('Config: loaded configuration from file: '+mmxMySQLConfigPath);
            cb(null, obj);
        }catch(e){
            winston.error('Config: error reading mmx mysql settings: ', e);
            return cb('read-error');
        }
    });
};

ConfigManager.prototype.setMMXMySQL = function(obj, cb){
    var config = _.extend({}, obj);
    delete config.password;
    delete config.sync;
    delete config.charset;
    delete config.dialog;
    fs.writeFile(mmxMySQLConfigPath, JSON.stringify(config, undefined, 4), function(e){
        if(e){
            winston.error('Config: error saving mmx mysql settings: ', e);
            return cb('save-error');
        }
        cb();
    });
};

ConfigManager.prototype.getAutoLoginConfig = function(cb){
    fs.readFile(autologinConfigPath, {encoding : 'utf-8'}, function(e, data){
        if(e) return cb(e);
        winston.silly('Config: loaded auth file: '+autologinConfigPath);
        try{
            var obj = JSON.parse(data);
            fs.unlink(autologinConfigPath, function(e){
                if(e) return cb();
                winston.silly('Config: deleted auth file: '+autologinConfigPath);
                cb(null, obj);
            });
        }catch(e){
            return cb(e);
        }
    });
};

ConfigManager.prototype.setAuthFile = function(auth){
    fs.writeFile(autologinConfigPath, JSON.stringify(auth, undefined, 4));
};

ConfigManager.prototype.setConfig = function(section, configs, cb){
    var me = this;
    if(!me.configs[section]) return cb('invalid-section');
    if(section == 'Database') return me.setDB(configs, cb);
    if(section == 'MMX') return me.setMessaging(configs, cb);
    if(section == 'Redis') return me.setRedis(configs, cb);
    if(section == 'Geologging') return require('../lib/Geologger').setConfig(configs, cb);
    me.set(section, configs, function(e){
        if(e) return cb(e);
        if(['EmailAlerts', 'DatabaseLog', 'FileLog', 'ConsoleLog'].indexOf(section) != -1)
            require('../lib/LogManager').setHandler(section);
        winston.info('Config: successfully configured section "'+section+'" of config.');
        cb();
    });
};

function isPrivate(key){
    return key.toLowerCase().indexOf('pass') !== -1 || key.toLowerCase().indexOf('sessionsecret') !== -1;
}

module.exports = new ConfigManager();
module.exports.autologinConfigPath = autologinConfigPath;