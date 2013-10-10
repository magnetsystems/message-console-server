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
            callback('invalid-login');
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

module.exports = new AccountManager();