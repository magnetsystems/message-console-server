var UserManager = require('../UserManager')
, orm = require('../orm')
, magnetId = require('node-uuid');

var StartupModels = function(){};

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
                                    winston.info('User: admin user with cloud account created: ', userObj);
                                    callback();
                                }
                        });
                    }else{
                        winston.info('User: admin user created: ', userObj);
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

module.exports = new StartupModels();