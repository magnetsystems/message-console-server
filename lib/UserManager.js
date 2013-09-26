var hash = require('./modules/hash')
, Enum = require('enum')
, orm = require('./orm')
, magnetId = require('node-uuid');

var UserManager = function(){};

UserManager.prototype.checkAuthority = function(types, isAPI){
    return function(req, res, next){
        if(req.session.user && types.indexOf(req.session.user.userType) != -1){
            if(isAPI){
                // disable caching for dynamic content
                res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.header('Pragma', 'no-cache');
                res.header('Expires', 0);
            }
            // nodejs requires a manual refresh of session or else it will expire
            req.session._garbage = Date();
            req.session.touch();
            next();
        }else{
            if(isAPI){
                res.send('session-expired', 278);
            }else{
                res.redirect('/login');
            }
        }
    }
};

// create user
UserManager.prototype.create = function(userObj, callback){
    // check if email address exists
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).success(function(user){
        if(!user){
            userObj.password = hash.md5(userObj.password);
            orm.model('User').create(userObj).success(function(user){
                callback();
            }).error(function(e){
                console.error('Registration: user "' + userObj.email + '" failed: ', e);
                callback('registration-failed');
            });
        }
    });
};

// create user
UserManager.prototype.read = function(sessionUser, callback){
    // check if email address exists
    orm.model('User').find({
        where : {
            email : sessionUser.email
        }
    }).success(function(user){
        if(user){
            callback(null, user);
        }else{
            callback('user-not-exist');
        }
    }).error(function(){
        callback('user-fetch-failed');
    });
};

// update user
UserManager.prototype.update = function(sessionUser, userObj, callback){
    // check if email address exists
    orm.model('User').find({
        where : {
            email : sessionUser.email
        }
    }).success(function(user){
            if(user){
                // update user details
                user.firstName = userObj.firstName;
                user.lastName = userObj.lastName;
                user.company = userObj.company;
                if(userObj.newpass && userObj.newpass.length > 0){
                    if(hash.md5(userObj.oldpass) == user.password){
                        user.password = hash.md5(userObj.newpass);
                    }else{
                        console.log('Accounts: user "' + sessionUser.email + '" update failed: old-pass-not-match');
                        callback('old-pass-not-match');
                        return false;
                    }
                }
                user.save().success(function(){
                    callback(null, user);
                }).error(function(){
                    console.log('Accounts: user "' + sessionUser.email + '" update failed: ' + e);
                    callback('error-updating-user');
                });
            }else{
                console.log('Accounts: user "' + sessionUser.email + '" update failed: ' + 'user-not-found');
                callback('user-not-found');
            }
        });
};

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

var RegisterGuestStatusEnum = new Enum({
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    REGISTRATION_FAILED: 'REGISTRATION_FAILED',
    REGISTRATION_SUCCESSFUL: 'REGISTRATION_SUCCESSFUL'
});

/*
 {
 "firstName" : "Pritesh",
 "lastName" : "Shah",
 "email" : "pritesh.shah@magnet.com",
 "companyName" : "Magnet Systems, Inc."
 }
 */
UserManager.prototype.registerGuest = function(userObj, callback){
    // check if email address exists
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).success(function(user){
        if (!user) {
            // Generate the User UUID
            userObj.magnetId = magnetId.v1();
            userObj.userType = 'guest';

            orm.model('User').create(userObj, [ 'magnetId', 'firstName', 'lastName', 'email', 'companyName', 'userType' ]).success(function(user){
                console.log('Registration: user "' + userObj.email + '" succeeded');
                callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);

                // TODO: Send email to Magnet Admin
            }).error(function(e){
                console.error('Registration: user "' + userObj.email + '" failed: ', e);
                callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
            });
        } else {
            callback(RegisterGuestStatusEnum.USER_ALREADY_EXISTS, user);
        }
    });
};

var ApproveUserStatusEnum = new Enum({
    USER_DOES_NOT_EXIST: 'USER_DOES_NOT_EXIST',
    APPROVAL_FAILED: 'APPROVAL_FAILED',
    APPROVAL_SUCCESSFUL: 'APPROVAL_SUCCESSFUL'
});

UserManager.prototype.approveUser = function(userObj, callback){
    // check if magnetId exists
    orm.model('User').find({
        where : {
            magnetId : userObj.magnetId
        }
    }).success(function(user){
            if (user) {

                console.log('Approval fetched: user "' + user.email + '" succeeded');

                user.updateAttributes({userType: 'approved'}, [ 'userType' ]).success(function(){
                    console.log('Approval: user "' + user.email + '" succeeded');
                    callback(ApproveUserStatusEnum.APPROVAL_SUCCESSFUL, user);

                    // TODO: Send email to User
                }).error(function(e){
                        console.error('Approval: user "' + user.email + '" failed: ', e);
                        callback(ApproveUserStatusEnum.APPROVAL_FAILED, user);
                    });
            } else {
                callback(ApproveUserStatusEnum.USER_DOES_NOT_EXIST, user);
            }
        });
};

var BecomeDeveloperStatusEnum = new Enum({
    USER_DOES_NOT_EXIST: 'USER_DOES_NOT_EXIST',
    FAILED: 'FAILED',
    SUCCESSFUL: 'SUCCESSFUL'
});

UserManager.prototype.becomeDeveloper = function(userObj, callback){
    // check if magnetId exists
    orm.model('User').find({
        where : {
            magnetId : userObj.magnetId,
            userType: 'approved'
        }
    }).success(function(user){
            if (user) {

                console.log('Approval fetched: user "' + user.email + '" succeeded');

                userObj.userType = 'developer';
                userObj.password = hash.md5(userObj.password);

                user.updateAttributes(userObj, [ 'userType', 'password', 'roleWithinCompany', 'country' ]).success(function(){
                    console.log('Became developer: user "' + user.email + '" succeeded');
                    callback(BecomeDeveloperStatusEnum.SUCCESSFUL, user);

                    // TODO: Send email to User
                }).error(function(e){
                        console.error('Became developer: user "' + user.email + '" failed: ', e);
                        callback(BecomeDeveloperStatusEnum.FAILED, user);
                    });
            } else {
                callback(BecomeDeveloperStatusEnum.USER_DOES_NOT_EXIST, user);
            }
        });
};

module.exports = new UserManager();
module.exports.RegisterGuestStatusEnum = RegisterGuestStatusEnum;
module.exports.ApproveUserStatusEnum = ApproveUserStatusEnum;
module.exports.BecomeDeveloperStatusEnum = BecomeDeveloperStatusEnum;
