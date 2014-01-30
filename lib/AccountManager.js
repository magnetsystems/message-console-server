var orm = require('./orm')
, bcrypt = require('bcrypt');

var AccountManager = function(){};

/* AUTHENTICATION */

// user login
AccountManager.prototype.manualLogin = function(username, password, callback){
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
                    callback(null, user);
                } else {
                    callback('invalid-login');
                }
            });
        }
    });
};

AccountManager.prototype.authenticateWithCloudAccount = function(username, password, callback){
    orm.model('CloudAccount').find({
        where: ['provider=? AND accessKeyId=? AND secretAccessKey=?', 'AWS', username, password]
    }).success(function (cloudAccount) {
        if (cloudAccount) {
            cloudAccount.getUser().success(function (user) {
                if (user.userType == 'developer' || user.userType == 'admin') {
                    callback(null, user);
                } else if (user && user.activated === false) {
                    callback('account-locked');
                } else {
                    callback('invalid-login');
                }
            });
        } else {
            callback('invalid-login');
        }
    });
}

module.exports = new AccountManager();