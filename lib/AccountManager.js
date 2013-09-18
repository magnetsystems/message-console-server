var hash = require('./modules/hash')
, Schemas = require('./Schemas');

var AccountManager = function(){
    User = GLOBAL.db.model('User', Schemas.get('User'));
    return this;
}

/* AUTHENTICATION */

// automatic user login
AccountManager.prototype.autoLogin = function(username, password, callback){
	User.findOne({
        username : username
    }, function(e, user){
		if(user){
			if(user.password == password){
                user.tracking.logins++;
                user.tracking.lastseen = new Date();
                user.save(function(e){
                    if(e){
                        console.log('Tracking: user "' + user.username + '" tracking update failed: ' + e);
                    }
                });
                callback(user);
            }else{
                callback(null);
            }
		}else{
			callback(null);
		}
	});
}
// manual user login
AccountManager.prototype.manualLogin = function(username, password, callback){
    // find a user matching the supplied username 
	User.findOne({
        username : username
    }, function(e, user){
		if(user == null){
			callback('invalid-login');
		}else{
            // if a user is found, compare the md5 hash
            if(hash.md5(password) === user.password){
                user.tracking.logins++;
                user.tracking.lastseen = new Date();
                user.save(function(e){
                    if(e){
                        console.log('Tracking: user "' + user.username + '" tracking update failed: ' + e);
                    }
                });
                callback(null, user);
            }else{
                callback('invalid-login');
            }
		}
	});
}

/* REGISTRATION */

module.exports = new AccountManager();