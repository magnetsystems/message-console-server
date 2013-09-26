var hash = require('./modules/hash')
, orm = require('./orm');

var AccountManager = function(){};

/* AUTHENTICATION */

// user login
AccountManager.prototype.manualLogin = function(username, password, callback){
    // find a user matching the supplied username
    orm.model('User').find({
        where: ['email=? AND (userType=? OR userType=?) AND password=?', username, 'developer', 'admin', hash.md5(password)]
    }).success(function(user){
        if(!user){
            callback('invalid-login');
        }else{
            callback(null, user);
        }
    });
};

module.exports = new AccountManager();