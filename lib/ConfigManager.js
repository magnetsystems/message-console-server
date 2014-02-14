var orm = require('./orm');

var AppConfigManager = function(){};

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