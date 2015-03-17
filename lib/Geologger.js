var Component = require('node-xmpp-component')
, ConfigManager = require('../lib/ConfigManager')
, MMXManager = require('../lib/MMXManager')
, magnetId = require('node-uuid')
, _ = require('underscore');

var Geologger = function(){
    this.records = [];
    this.isInit = false;
    this.storeInProcess = false;
    this.deleteIntervalInProcess = false;
    this.deletionTimeout;
};

Geologger.prototype.serviceState = {};

Geologger.prototype.setConfig = function(config, cb){
    var me = this;
    if(me.component){
        me.component.removeAllListeners();
        me.component.end();
    }
    MMXManager.setConfigs({
        configs : {
            'ext.service.event.geo'        : config.jid,
            'ext.service.event.geo.secret' : config.secretkey,
            'ext.service.port'             : config.port
        }
    }, function(e){
        if(e) return cb(e);
        me.serviceState.enabled = config.enabled;
        if(!config.enabled){
            ConfigManager.set('Geologging', config, function(e){
                if(e) return cb(e);
                winston.info('Config: successfully configured messaging server properties.');
                cb();
            });
        }else{
            me.init(config, cb);
        }
    });
};

Geologger.prototype.init = function(config, cb){
    var me = this, extended;
    config = config || ENV_CONFIG.Geologging;
    extended = _.extend({}, config);
    extended.password = config.secretkey;
    extended.jid = extended.jid+'-'+new Date().getTime();
    me.component = new Component(extended);
    me.serviceState.enabled = config.enabled;
    me.component.on('online', function(){
        me.jid = extended.jid;
        if(typeof cb === typeof Function){
            ConfigManager.set('Geologging', config, function(e){
                if(e) return cb(e);
                winston.info('Geologger: XMPP component was configured successfully and connected.');
                if(me.deletionTimeout){
                    clearTimeout(me.deletionTimeout);
                    me.deleteIntervalInProcess = false;
                }
                me.intervalDeleteOutdated();
                cb();
            });
        }else{
            if(!me.isInit){
                me.isInit = true;
                winston.info('Geologger: XMPP component connected.');
            }else{
                winston.verbose('Geologger: XMPP component reconnected.');
            }
            if(!me.deleteIntervalInProcess)
                me.intervalDeleteOutdated();
        }
        me.serviceState.connectivity = true;
    });
    me.component.on('stanza', function(stanza){
        me.log(stanza);
    });
    me.component.on('error', function(e){
        winston.error('Geologger: XMPP component could not connect: ', e);
        if(typeof cb === typeof Function) cb(e);
    });
    me.component.on('disconnect', function(e){
        me.serviceState.connectivity = false;
        me.serviceState.lastConnected = new Date();
        if(typeof cb === typeof Function){
            winston.error('Geologger: XMPP component could not connect: ', e);
            cb(e);
        }else{
            winston.verbose('Geologger: XMPP component disconnected.');
        }
    });
};

Geologger.prototype.log = function(stanza){
    var body, geoEntries;
    winston.silly('Geologger: received stanza: ', stanza.toString());
    try{
        body = stanza.getChildText('body');
        geoEntries = JSON.parse(body);
    }catch(e){
        winston.warn('Geologger: error parsing stanza: ', body);
    }
    if(geoEntries){
        if(_.isArray(geoEntries) && geoEntries.length){
            console.log(geoEntries);
            this.records = this.records.concat(geoEntries);
        }else{
            this.records.push(geoEntries);
        }
        this.store();
    }
};

Geologger.prototype.store = function(){
    var me = this;
    if(me.storeInProcess)
        return winston.verbose('Geologger: cannot store: another store is in-process.');
    if(!_.isArray(me.records))
        return winston.error('Geologger: cannot store: invalid payload.');
    if(!me.records.length)
        return winston.error('Geologger: cannot store: no records to store.');
    ConfigManager.get('Geologging', function(){
        if(me.records.length < ENV_CONFIG.Geologging.flushInterval)
            return winston.verbose('Geologger: cannot store: flush limit not met: '+me.records.length+'/'+ENV_CONFIG.Geologging.flushInterval+'.');
        me.storeInProcess = true;
        require('./orm').model('Geo').bulkCreate(me.records).then(function(e){
            winston.verbose('Geologger: save geolocation success.');
            me.records = [];
        }).catch(function(e){
            winston.error('Geologger: save geolocation failed: ', e);
        }).done(function(e){
            me.storeInProcess = false;
        });
    });
};

Geologger.prototype.intervalDeleteOutdated = function(){
    var me = this;
    me.deleteIntervalInProcess = true;
    me.deletionTimeout = setTimeout(function(){
        ConfigManager.get('Geologging', function(){
            if(!ENV_CONFIG.Geologging.enabled){
                me.deleteIntervalInProcess = false;
                return;
            }
            me.deleteOutdated(function(){
                me.intervalDeleteOutdated();
            });
        });
    }, 1000 * 60 * ENV_CONFIG.Geologging.cleanupInterval);
};

Geologger.prototype.deleteOutdated = function(cb){
    require('./orm').model('Geo').destroy({
        where : {
            stamp : {
                lt : require('./orm').seq().literal("(NOW() - INTERVAL "+ENV_CONFIG.Geologging.expirationTimeout+" MINUTE)")
            }
        }
    }).then(function(e){
        winston.verbose('Geologger: removed outdated geolocation records.');
    }).catch(function(e){
        winston.error('Geologger: error removing outdated geolocation records: ', e);
    }).done(function(e){
        cb();
    });
};

module.exports = new Geologger();