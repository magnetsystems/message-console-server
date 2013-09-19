var hash = require('./modules/hash')
, orm = require('./orm');

var AccountManager = function(){};

/* AUTHENTICATION */

// user login
AccountManager.prototype.manualLogin = function(username, password, callback){
    // find a user matching the supplied username
    orm.model('User').find({
        where : {
            email : username
        }
    }).success(function(user){
        if(!user){
            callback('invalid-login');
        }else{
            // if a user is found, compare the md5 hash
            if(hash.md5(password) === user.password){
                callback(null, user);
            }else{
                callback('invalid-login');
            }
        }
    });
};

module.exports = new AccountManager();