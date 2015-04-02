var orm = require('./orm')
, MMXManager = require('../lib/MMXManager')
, bcrypt = require('bcryptjs');

var AccountManager = function(){};

AccountManager.prototype.manualLogin = function(username, password, callback, noMMXApp){
    var newMMXUser = false;
    if(typeof username != 'string')
        return callback('invalid-login');
    orm.model('User').find({
        where : ['email=? AND (userType=? OR userType=?)', username, 'developer', 'admin']
    }).then(function(user){
        if(!user)
            return callback('invalid-login');
        if(user && user.activated === false)
            return callback('account-locked');
        bcrypt.compare(password, user.password, function(err, isPasswordCorrect){
            if(!isPasswordCorrect) return callback('invalid-login');
            if(!noMMXApp && typeof user.hasMMXApp !== 'undefined' && user.hasMMXApp === false){
                newMMXUser = true;
                MMXManager.createApp(user.email, user.magnetId, {
                    name : 'My Messaging App'
                }, function(e){
                    if(e){
                        winston.error('User: unable to create an initial mmx app for user "' + user.email + '": ', e);
                    }
                });
                user.updateAttributes({hasMMXApp : true}, ['hasMMXApp']).then(function(){
                    winston.verbose('User: set flag for creation of initial mmx app for user "' + user.email + '"');
                }).catch(function(e){
                    winston.error('User: unable to set initial mmx app creation flag for user "' + user.email + '": ', e);
                });
            }
            callback(null, user, newMMXUser);
        });
    }).catch(function(e){
        return callback('invalid-login');
    });
};

module.exports = new AccountManager();