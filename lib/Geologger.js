var Component = require('node-xmpp-component')
, ConfigManager = require('../lib/ConfigManager')
, _ = require('underscore');

var Geologger = function(){
    this.records = [];
    this.isInit = false;
    this.storeInProcess = false;
    this.deleteIntervalInProcess = false;
    this.deletionTimeout;
};

Geologger.prototype.init = function(config, cb){
    var me = this;
    if(me.component){
        me.component.removeAllListeners();
        me.component.end();
    }
    if(config && !config.enabled)
        return ConfigManager.set('Geologging', config, cb);
    config = config || ENV_CONFIG.Geologging;
    me.component = new Component(config);
    me.component.on('online', function(){
        if(typeof cb === typeof Function){
            ConfigManager.set('Geologging', config, function(e){
                if(e) return cb(e);
                winston.info('Geologger: XMPP component was configured successfully.');
                if(me.deletionTimeout){
                    clearTimeout(me.deletionTimeout);
                    me.deleteIntervalInProcess = false;
                    me.intervalDeleteOutdated();
                }
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
    });
    me.component.on('stanza', function(stanza){
        me.log(stanza);
    });
    me.component.on('disconnect', function(e){
        if(typeof cb === typeof Function){
            winston.error('Geologger: XMPP component could not connect: ', e);
            cb(e);
        }else{
            winston.verbose('Geologger: XMPP component disconnected: ', e);
        }
    });
};

// {"long":1000000,"lat":10000001,"geohash":"geo-uri1","deviceId":"device1","userId":"user1","appId":"aaaaaaaa1"}
// [{"long":1000000,"lat":10000001,"geohash":"geo-uri1","deviceId":"device1","userId":"user1","appId":"aaaaaaaa1"}, {"long":1000002,"lat":10000003,"geohash":"geo-uri2","deviceId":"device2","userId":"user2","appId":"aaaaaaaa2"}]

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
            createdAt : {
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