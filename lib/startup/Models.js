var UserManager = require('../UserManager')
, orm = require('../orm')
, Jobs = require('../Jobs')
, magnetId = require('node-uuid');

var StartupModels = function(){};

StartupModels.prototype.modelSetup = function(callback){
    var me = this;
    me.setupConfig();
    if(ENV_CONFIG.Database.options.createAdmin){
        me.setupAdmin(function(){
            callback();
        });
    }
    me.startJobs();
}

StartupModels.prototype.setupConfig = function(){
    orm.model('AppConfig').findOrCreate({skipAdminApproval:false}, {magnetId:magnetId.v1()}).success(function(appConfig){
        APP_CONFIG = appConfig;
        winston.info('AppConfig: app configuration has been applied successfully.');
    }).error(function(e){
        winston.error('AppConfig: error applying app configuration.', e);
        throw new Error('error applying app configuration');
    });
};

StartupModels.prototype.setupAdmin = function(callback){
    var userObj = ENV_CONFIG.Users.admin.user;
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).success(function(user){
        if(!user){
            userObj.userType = 'admin';
            UserManager.create(userObj, function(e, user){
                if(e){
                    callback(e);
                }else{
                    if(ENV_CONFIG.Users.admin.cloudAccount){
                        // Admin user will use preconfigured environment variable keys.
                        // Let's use the keys for the user NodeJsUploadTest@magnet.com in AWS.
                        UserManager.createCloudAccount(
                            user,
                            ENV_CONFIG.Users.admin.cloudAccount.AccessKeyId,
                            ENV_CONFIG.Users.admin.cloudAccount.SecretAccessKey, function(e, cloudAccount){
                                if(e){
                                    callback(e);
                                }else{
                                    winston.info('User: admin user with cloud account created: '+userObj.email);
                                    callback();
                                }
                        });
                    }else{
                        winston.info('User: admin user created: '+userObj.email);
                        callback();
                    }
                }
            });
        }else{
            winston.info('User: admin user already exists.');
            callback();
        }
    });
};

StartupModels.prototype.startJobs = function(){
    Jobs.create('Announcements', 5, function(opts){
        orm.model('Announcement').findAll({
            order      : '`createdAt` DESC',
            attributes : ['id', 'subject', 'description', 'hyperlink', 'updatedAt']
        }).success(function(models){
            winston.verbose('Jobs: updated cached announcements.');
            opts.success(models);
        }).error(opts.error);
    });
    Jobs.refresh('Announcements');
};

module.exports = new StartupModels();