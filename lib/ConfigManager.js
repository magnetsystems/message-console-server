var orm = require('./orm')
, Jobs = require('./Jobs');

var AppConfigManager = function(){
    var pollDBReady = setInterval(function(){
        if(APP_CONFIG.dbReady === true){
            Jobs.create('AppConfigs', ENV_CONFIG.General.syncConfigInterval, function(opts){
                orm.model('AppConfig').find({where:['1=1']}).success(function(appConfig){
                    APP_CONFIG = appConfig;
                    winston.info('AppConfig: app configuration has been applied successfully.');
                    opts.success(appConfig);
                });
            });
            Jobs.start('AppConfigs');
            clearInterval(pollDBReady);
        }else{
            winston.info('AppConfig: waiting for database setup to complete.');
        }
    }, 2000);
};

AppConfigManager.prototype.set = function(props, callback){
    orm.model('AppConfig').find({where:['1=1']}).success(function(appConfig){
        appConfig.updateAttributes(props, ['skipAdminApproval', 'homePageVideoID']).success(function(appConfig){
            APP_CONFIG = appConfig;
            winston.info('AppConfig: property change successful: ', props);
            callback(null, props);
        }).error(function(e){
            winston.info('AppConfig: property change failed: ', e);
            callback('property-edit-failed');
        });
    });
};

module.exports = new AppConfigManager();