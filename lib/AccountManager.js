var orm = require('./orm')
, MMXManager = require('../lib/MMXManager')
, bcrypt = require('bcrypt');

var AccountManager = function(){};

/* AUTHENTICATION */

// user login
AccountManager.prototype.manualLogin = function(username, password, callback){
    var newMMXUser = false;
    if(typeof username != 'string'){
        callback('invalid-login');
        return false;
    }
    // find a user matching the supplied username
    orm.model('User').find({
        where: ['email=? AND (userType=? OR userType=?)', username, 'developer', 'admin']
    }).success(function(user){
        if(!user){
            // Try to authenticate with cloud credentials
            AccountManager.prototype.authenticateWithCloudAccount(username, password, callback);
        }else if(user && user.activated === false){
            callback('account-locked');
        }else{
            bcrypt.compare(password, user.password, function(err, isPasswordCorrect) {
                if (isPasswordCorrect) {
                    if(typeof user.hasMMXApp !== 'undefined' && user.hasMMXApp === false){
                        newMMXUser = true;
                        MMXManager.createApp(user.email, user.magnetId, {
                            appName : 'My Messaging App'
                        }, function(e){
                            if(e){
                                winston.error('User: unable to create an initial mmx app for user "' + user.email + '": ', e);
                            }else{
                                user.updateAttributes({hasMMXApp: true}, ['hasMMXApp']).success(function(){
                                    winston.verbose('User: created an initial mmx app for user "' + user.email + '": ', e);
                                }).error(function(e){
                                    winston.error('User: unable to set initial mmx app creation flag for user "' + user.email + '": ', e);
                                });
                            }
                        });
                    }
                    callback(null, user, newMMXUser);
                } else {
                    callback('invalid-login');
                }
            });
        }
    });
};

AccountManager.prototype.authenticateWithCloudAccount = function(accessKey, secretKey, callback){
    if(typeof accessKey != 'string' || typeof secretKey != 'string'){
        callback('invalid-login');
        return false;
    }
    orm.model('CloudAccount').find({
        where : {
            accessKeyId     : accessKey,
            secretAccessKey : secretKey,
            enabled         : true
        }
    }).success(function(cloudAccount){
        if(cloudAccount){
            cloudAccount.getUser().success(function(user){
                if(user.userType == 'developer' || user.userType == 'admin'){
                    callback(null, user);
                }else if(user && user.activated === false){
                    callback('account-locked');
                }else{
                    callback('invalid-login');
                }
            });
        }else{
            callback('invalid-login');
        }
    });
}

module.exports = new AccountManager();