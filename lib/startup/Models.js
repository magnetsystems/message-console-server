var UserManager = require('../UserManager')
, orm = require('../orm')
, Jobs = require('../Jobs')
, magnetId = require('node-uuid');

var StartupModels = function(){};

StartupModels.prototype.modelSetup = function(callback){
    var me = this;
    if(ENV_CONFIG.Database.options.createAdmin){
        me.setupAdmin(function(){
            callback();
        });
    }else{
        callback();
    }
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
                    winston.info('User: admin user created: '+userObj.email);
                    callback();
                }
            });
        }else{
            winston.info('User: admin user already exists.');
            callback();
        }
    });
};

module.exports = new StartupModels();