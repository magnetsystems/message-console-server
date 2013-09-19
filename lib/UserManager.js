var hash = require('./modules/hash')
, orm = require('./orm');

var UserManager = function(){};

/* CREATE */

UserManager.prototype.checkAuthority = function(types){
    return function(req, res, next){
        if(req.session.user && types.indexOf(req.session.user.userType) != -1){
            next();
        }else{
            res.redirect('/login');
        }
    }
}

UserManager.prototype.create = function(userObj, callback){
    // check if username exists
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).success(function(project){
        console.log(project);
    });
    return false;
    User.findOne({
        userName : userObj.userName
    }, function(e, o){
        if(o){
            console.log('Registration: user "' + userObj.username + '" failed: user-exists');
            callback('user-exists');
        }else{
            // check if email exists
            User.findOne({
                email : userObj.email
            }, function(e, o){
                if(o){
                    console.log('Registration: user "' + userObj.username + '" failed: email-exists');
                    callback('email-exists');
                }else{
                    var user = new User(userObj);
                    // encrypt password and add tracking
                    user.password = hash.md5(userObj.password);
                    user.tracking = {
                        created : new Date(),
                        logins  : 0
                    }
                    user.save(function(e){
                        if(e){
                            console.log('Registration: user "' + userObj.username + '" failed: ' + e);
                            callback('registration-failed');
                        }else{
                            callback(null);
                        }
                    });
                }
            });
        }
    });
}

/* UPDATE */

// update user details
UserManager.prototype.update = function(sessionUser, userObj, callback){
    User.findOne({
        username : sessionUser.username
    }, function(e, user){
        if(user){
            // check if email exists
            User.findOne({
                email : userObj.email
            }, function(e, o){
                if(o && sessionUser.email != userObj.email){
                    console.log('Accounts: user "' + sessionUser.username + '" update failed: email-exists');
                    callback('email-exists');
                }else{
                    // update user details
                    user.name = userObj.name;
                    user.email = userObj.email;
                    user.country = userObj.country;
                    if(!userObj.newpass == ''){
                        if(hash.md5(userObj.oldpass) == user.password){
                            user.password = hash.md5(userObj.newpass);
                        }else{
                            console.log('Accounts: user "' + sessionUser.username + '" update failed: old-pass-not-match');
                            callback('old-pass-not-match');
                            return false;
                        }
                    }
                    user.save(function(e){
                        if(e){
                            console.log('Accounts: user "' + sessionUser.username + '" update failed: ' + e);
                            callback('error-updating-user');
                        }else{
                            callback(null, user);
                        }
                    });
                }
            });
        }else{
            console.log('Accounts: user "' + sessionUser.username + '" update failed: ' + e);
            callback('error-updating-user');
        }
    });
}

// find a user by email and change the password
UserManager.prototype.setPassword = function(email, password, callback){
    this.getByEmail(email, function(e, user){
        if(user){
            user.password = hash.md5(password);
            user.save(function(e){
                if(e){
                    console.log('Accounts: user "' + sessionUser.username + '" password update failed: ' + e);
                    callback('error-changing-password');
                }else{
                    callback(null, user);
                }
            });
        }else{
            console.log('Accounts: user "' + sessionUser.username + '" password update failed: ' + e);
            callback(e);
        }
    });
}

/* RETRIEVE */

// get a user by specified properties
UserManager.prototype.getBy = function(obj, callback){
    User.findOne(obj, function(e, user){
        if(user){
            callback(null, user);
        }else{
            console.log('Accounts: get single user by properties failed: ' + e);
            callback('user-not-found');
        }
    });
}
// get a user by email address
UserManager.prototype.getByEmail = function(email, callback){
    User.findOne({
        email : email
    }, function(e, user){
        if(user){
            callback(null, user);
        }else{
            console.log('Accounts: get single user by email failed: ' + e);
            callback('email-not-found');
        }
    });
}
// get a list of all users
UserManager.prototype.getAllUsers = function(callback){
    User.find(function(e, users){
        if(e){
            console.log('Accounts: get all users failed: ' + e);
            callback('server error');
        }else{
            callback(null, users);
        }
    });
}
// find a user by id
UserManager.prototype.getById = function(id, selects, callback){
    User.findOne({
        _id : id
    }, selects, function(e, user){
        if(e){
            callback(e);
        }else{
            callback(null, user);
        }
    });
}
// obtain a set of users by name/value pairs of parameters - NOT USED
UserManager.prototype.findByMultipleFields = function(ary, callback){
    User.find({
        $or : ary
    }, function(e, users){
        if(e){
            callback(e);
        }else{
            callback(null, users);
        }
    });
}

/* DELETE */

// remove all users
UserManager.prototype.deleteAllUsers = function(callback){
    User.remove(function(e){
        if(e){
            console.log('Accounts: delete all users failed: ' + e);
            callback('users-delete-error');
        }else{
            callback(null);
        }
    });
}
// delete a single user
UserManager.prototype.delete = function(id, callback){
    User.remove({
        _id : id
    }, function(e){
        if(e){
            console.log('Accounts: delete single user (' + id + ' failed: ' + e);
            callback('user-delete-error');
        }else{
            callback(null);
        }
    });
}

module.exports = new UserManager();