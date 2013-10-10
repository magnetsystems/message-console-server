var Enum = require('enum')
, orm = require('./orm')
, magnetId = require('node-uuid')
, Cloud = require('./Cloud')
, EmailService = require('./EmailService')
, License = require('./License')
, bcrypt = require('bcrypt');

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
                req.session.entryPoint = req.url;
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
            bcrypt.hash(userObj.password, 10, function(err, hash) {
                userObj.password = hash;
                var userMagnetId = userObj.magnetId || magnetId.v1();
                // Generate license
                License.sign(userMagnetId, function(signature) {
                    userObj.magnetId = userMagnetId;
                    userObj.signedLicenseKey = signature;
                    orm.model('User').create(userObj).success(function(user){
                        // TODO: Code below is duplicate
                        // Create Cloud Account
                        var cloudAccountMagnetId = magnetId.v1();

                        // This is only used for Setup purposes.
                        // We can hardcode the keys. Let's use the keys for the user NodeJsUploadTest@magnet.com in AWS.
                        var provider = 'AWS';
                        var cloudAccount = orm.model('CloudAccount').build({
                            magnetId : cloudAccountMagnetId,
                            ownerType : 'User',
                            name : user.email + "'s " + provider + " Account",
                            provider: provider,
                            bucketName : userMagnetId,
                            accessKeyId : ENV_CONFIG.Cloud.Uploader.AccessKeyId,
                            secretAccessKey : ENV_CONFIG.Cloud.Uploader.SecretAccessKey
                        });

                        user.addCloudAccount(cloudAccount).success(function() {
                            winston.log("Successfully created cloud account");
                            callback(null, user);
                        }).error(function (error) {
                                callback('registration-failed');
                            });
                    }).error(function(e){
                            winston.error('Registration: user "' + userObj.email + '" failed: ', e);
                            callback('registration-failed');
                        });
                });
            });
        }else{
            winston.error('Registration: user "' + userObj.email + '" failed: user already exists');
            callback('user-exists', user);
        }
    });
};

// get user information
UserManager.prototype.read = function(magnetId, notAuth, callback){
    var attributes = notAuth ? ['email'] : ['id', 'magnetId', 'email', 'firstName', 'lastName', 'companyName', 'country', 'roleWithinCompany'];
    // check if magnetId exists
    orm.model('User').find({
        where      : {
            magnetId : magnetId
        },
        attributes : attributes
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
            user.companyName = userObj.companyName;
            if(userObj.newpass && userObj.newpass.length > 0){
                bcrypt.compare(userObj.oldpass, user.password, function(err, isPasswordCorrect) {
                    if (isPasswordCorrect) {
                        bcrypt.hash(userObj.newpass, 10, function(err, hash) {
                            user.password = hash;
                            user.save().success(function(){
                                callback(null, user);
                            }).error(function(e){
                                    winston.log('Accounts: user "' + sessionUser.email + '" update failed: ' + e);
                                    callback('error-updating-user');
                                });
                        });
                    } else {
                        winston.log('Accounts: user "' + sessionUser.email + '" update failed: old-pass-not-match');
                        callback('old-pass-not-match');
                        return false;
                    }
                });
            } else {
                user.save().success(function(){
                    callback(null, user);
                }).error(function(e){
                        winston.log('Accounts: user "' + sessionUser.email + '" update failed: ' + e);
                        callback('error-updating-user');
                    });
            }
        }else{
            winston.log('Accounts: user "' + sessionUser.email + '" update failed: ' + 'user-not-found');
            callback('user-not-found');
        }
    });
};

// find a user by email and change the password
UserManager.prototype.setPassword = function(email, password, callback){
    this.getByEmail(email, function(e, user){
        if(user){
            bcrypt.hash(password, 10, function(err, hash) {
                user.password = hash;
                user.save(function(e){
                    if(e){
                        winston.log('Accounts: user "' + sessionUser.username + '" password update failed: ' + e);
                        callback('error-changing-password');
                    }else{
                        callback(null, user);
                    }
                });
            });
        }else{
            winston.log('Accounts: user "' + sessionUser.username + '" password update failed: ' + e);
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
            winston.log('Accounts: get single user by properties failed: ' + e);
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
            winston.log('Accounts: get single user by email failed: ' + e);
            callback('email-not-found');
        }
    });
}
// get a list of all users
UserManager.prototype.getAllUsers = function(callback){
    User.find(function(e, users){
        if(e){
            winston.log('Accounts: get all users failed: ' + e);
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

// delete a single user
UserManager.prototype.delete = function(magnetId, callback){// check if email address exists
    orm.model('User').destroy({
        magnetId : magnetId
    }).success(function(){
        winston.log('User: deletion of single user (' + magnetId + ') succeeded.');
        callback(null);
    }).error(function(e){
        winston.log('User: deletion of single user (' + magnetId + ' failed: ', e);
        callback('user-delete-error');
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
UserManager.prototype.registerGuest = function(userObj, isInvitedByAdmin, callback){
    // check if email address exists
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).success(function(user){
        if (!user) {
            userObj.userType = 'guest';
            // Was this user invited?
            if (!userObj.magnetId) {
                // Generate the User UUID
                userObj.magnetId = magnetId.v1();
                orm.model('User').create(userObj, [ 'magnetId', 'firstName', 'lastName', 'email', 'companyName', 'userType', 'inviterId', 'invitedEmail' ]).success(function(user){
                    winston.log('Registration: user "' + userObj.email + '" succeeded');
                    callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                    // Send email to Magnet Admin
                    if (!isInvitedByAdmin) {
                        // Send email
                        UserManager.prototype.sendAdminEmail(userObj.firstName, userObj.lastName, userObj.email);
                    }
                }).error(function(e){
                        winston.error('Registration: user "' + userObj.email + '" failed: ', e);
                        callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
                    });
            } else {
                orm.model('User').find({
                    where : {
                        magnetId: userObj.magnetId,
                        userType: 'invited'
                    }
                }).success(function(invitedUser){
                        if (invitedUser) {
                            userObj.magnetId = invitedUser.magnetId;
                            invitedUser.updateAttributes(userObj, [ 'firstName', 'lastName', 'email', 'companyName', 'userType']).success(function(user){
                                winston.log('Registration: user "' + userObj.email + '" succeeded');
                                callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                                // Send email to Magnet Admin
                                if (!isInvitedByAdmin) {
                                    // Send email
                                    UserManager.prototype.sendAdminEmail(userObj.firstName, userObj.lastName, userObj.email);
                                }
                            }).error(function(e){
                                    winston.error('Registration: user "' + userObj.email + '" failed: ', e);
                                    callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
                                });
                        } else {
                            winston.error('Registration: user "' + userObj.email + '" failed: invalid magnetId');
                            callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
                        }
                    });
            }
        } else {
            callback(RegisterGuestStatusEnum.USER_ALREADY_EXISTS, user);
        }
    });
};

UserManager.prototype.sendAdminEmail = function(firstName, lastName, email) {
    var subject = 'Magnet Developer Factory Invitation Request';
    EmailService.sendEmail({
        to      : ENV_CONFIG.Email.supportEmail,
        subject : subject,
        html    : EmailService.renderTemplate({
            main : 'approval-email',
            vars : {
                firstName   : firstName,
                lastName    : lastName,
                email       : email,
                appUrl      : ENV_CONFIG.Email.appUrl,
                resourceUrl : ENV_CONFIG.Email.resourceUrl
            }
        }),
        success : function(){
//                        winston.log("")
        },
        error : function(e){
            winston.error("Failed to send %s email", subject);
        }
    });
};

var ApproveUserStatusEnum = new Enum({
    USER_DOES_NOT_EXIST: 'USER_DOES_NOT_EXIST',
    APPROVAL_FAILED: 'APPROVAL_FAILED',
    APPROVAL_SUCCESSFUL: 'APPROVAL_SUCCESSFUL'
});

UserManager.prototype.approveUser = function(userObj, isInvitedByAdmin, callback){
    // check if magnetId exists
    orm.model('User').find({
        where : {
            magnetId : userObj.magnetId,
            userType: 'guest'
        }
    }).success(function(user){
            if (user) {

                winston.log('Approval fetched: user "' + user.email + '" succeeded');

                user.updateAttributes({userType: 'approved'}, [ 'userType' ]).success(function(){
                    winston.log('Approval: user "' + user.email + '" succeeded');

                    // Send email to User
                    var extra;
                    if (!isInvitedByAdmin) {
                        extra = 's=u';
                    } else {
                        extra = 's=w';
                    }
                    var subject = 'Activate Your Magnet Developer Factory Account';
                    EmailService.sendEmail({
                        to      : user.email,
                        subject : subject,
                        html    : EmailService.renderTemplate({
                            main : 'html',
                            sub  : 'invite-confirm-email',
                            vars : {
                                emailTitle  : 'Your Activation',
                                resourceUrl : ENV_CONFIG.Email.resourceUrl,
                                url         : ENV_CONFIG.Email.appUrl + '/login/?a=confirm-registration&' + extra + '&t=' + user.magnetId
                            }
                        }),
                        success : function(){
                            callback(ApproveUserStatusEnum.APPROVAL_SUCCESSFUL, user);
                        },
                        error : function(e){
                            winston.log("Failed to send %s email", subject);
                        }
                    });

                }).error(function(e){
                        winston.error('Approval: user "' + user.email + '" failed: ', e);
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

                winston.log('Approval fetched: user "' + user.email + '" succeeded');

                userObj.userType = 'developer';
                bcrypt.hash(userObj.password, 10, function(err, hash) {
                    userObj.password = hash;
                    userObj.dateAcceptedEULA = new Date();

                    // Generate license
                    License.sign(user.magnetId, function(signature) {
                        user.signedLicenseKey = signature;
                        user.updateAttributes(userObj, [ 'userType', 'password', 'roleWithinCompany', 'country', 'firstName', 'lastName', 'companyName' ]).success(function(){
                            winston.log('Became developer: user "' + user.email + '" succeeded');

                            // Create Cloud Account
                            var cloudAccountMagnetId = magnetId.v1();

                            Cloud.allocateCloudAccount(user.magnetId, function(err, data) {
                                if (err) {
                                    winston.error("Error creating keys = " + err);
                                    callback(BecomeDeveloperStatusEnum.FAILED, user);
                                } else {
                                    var provider = 'AWS';
                                    var cloudAccount = orm.model('CloudAccount').build({
                                        magnetId        : cloudAccountMagnetId,
                                        ownerType       : 'User',
                                        name            : user.email + "'s " + provider + " Account",
                                        provider        : provider,
                                        bucketName      : user.magnetId,
                                        accessKeyId     : data.AccessKeyId,
                                        secretAccessKey : data.SecretAccessKey
                                    });

                                    user.addCloudAccount(cloudAccount).success(function() {
                                        winston.log("Successfully created cloud account");
                                        callback(BecomeDeveloperStatusEnum.SUCCESSFUL, user);
                                    }).error(function (error) {
                                            callback(BecomeDeveloperStatusEnum.FAILED, user);
                                        });
                                }
                            });
                        }).error(function(e){
                                winston.error('Became developer: user "' + user.email + '" failed: ', e);
                                callback(BecomeDeveloperStatusEnum.FAILED, user);
                            });
                    });
                });
            } else {
                callback(BecomeDeveloperStatusEnum.USER_DOES_NOT_EXIST, user);
            }
        });
};


var InviteUserStatusEnum = new Enum({
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    INVITATION_FAILED: 'REGISTRATION_FAILED',
    INVITATION_SUCCESSFUL: 'REGISTRATION_SUCCESSFUL'
});

/*
 {
 "email" : "pritesh.shah@magnet.com",
 }
 */
UserManager.prototype.inviteUser = function(userObj, firstName, lastName, introduceMsg, callback){
    // check if email address exists
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).success(function(user){
            if (!user) {
                // Generate the User UUID
                userObj.magnetId = magnetId.v1();
                userObj.userType = 'invited';
                // Set the invited email
                userObj.invitedEmail = userObj.email;
                delete userObj.email;

                orm.model('User').create(userObj, [ 'magnetId', 'firstName', 'lastName', 'email', 'companyName', 'userType', 'inviterId', 'invitedEmail' ]).success(function(user){
                    winston.log('User to User invitation: user "' + userObj.invitedEmail + '" succeeded');

                    // Send email to User
                    var subject = 'You are invited to the Magnet Developer Factory';
                    var extra = 's=w';
                    EmailService.sendEmail({
                        to      : user.invitedEmail,
                        subject : subject,
                        html    : EmailService.renderTemplate({
                            main : 'html',
                            sub: 'user-invite-user',
                            vars : {
                                introduceMsg: introduceMsg,
                                firstName: firstName,
                                lastName: lastName,
                                emailTitle: 'Your Activation',
                                resourceUrl: ENV_CONFIG.Email.resourceUrl,
                                url: ENV_CONFIG.Email.appUrl + '/login/?a=confirm-introduce&' + extra + '&t=' + user.magnetId
                            }
                        }),
                        success : function(){
                            callback(InviteUserStatusEnum.INVITATION_SUCCESSFUL, user);
                        },
                        error : function(e){
                            winston.log("Failed to send %s email", subject);
                            callback(InviteUserStatusEnum.INVITATION_FAILED, null);
                        }
                    });

                }).error(function(e){
                        winston.error('User to User invitation: user "' + userObj.invitedEmail + '" failed: ', e);
                        callback(InviteUserStatusEnum.INVITATION_FAILED, null);
                    });
            } else {
                callback(InviteUserStatusEnum.USER_ALREADY_EXISTS, user);
            }
        });
};

var SendForgotPasswordEmailEnum = new Enum({
    USER_DOES_NOT_EXIST: 'USER_DOES_NOT_EXIST',
    COULD_NOT_SET_RESET_TOKEN: 'COULD_NOT_SET_RESET_TOKEN',
    EMAIL_FAILED: 'EMAIL_FAILED',
    EMAIL_SUCCESSFUL: 'EMAIL_SUCCESSFUL'
});

/*
 {
 "email" : "pritesh.shah@magnet.com",
 }
 */
UserManager.prototype.sendForgotPasswordEmail = function(userObj, callback){
    // check if email address exists
    orm.model('User').find({
        where: ['email=? AND (userType=? OR userType=?)', userObj.email, 'developer', 'admin']
    }).success(function(user){
            if(!user){
                callback(SendForgotPasswordEmailEnum.USER_DOES_NOT_EXIST);
            }else{
                var passwordResetToken = magnetId.v1();
                userObj.passwordResetToken = passwordResetToken;
                user.updateAttributes(userObj, [ 'passwordResetToken' ]).success(function(){
                    winston.log('Added password reset token: user "' + user.email + '" succeeded');
                    // Send email to User
                    var subject = 'Reset Your Magnet Developer Factory Password';
                    EmailService.sendEmail({
                        to      : user.email,
                        subject : subject,
                        html    : EmailService.renderTemplate({
                            main : 'forgot-password-email',
                            vars : {
                                url: ENV_CONFIG.Email.appUrl + '/login/?a=reset-password&t=' + passwordResetToken
                            }
                        }),
                        success : function(){
                            callback(SendForgotPasswordEmailEnum.EMAIL_SUCCESSFUL);
                        },
                        error : function(e){
                            winston.error("Failed to send %s email", subject);
                            callback(SendForgotPasswordEmailEnum.EMAIL_FAILED);
                        }
                    });
                }).error(function(e){
                        winston.error('Added password reset token: user "' + userObj.email + '" failed: ');
                        callback(SendForgotPasswordEmailEnum.COULD_NOT_SET_RESET_TOKEN);
                    });
            }
        });
};

var ResetPasswordEnum = new Enum({
    USER_DOES_NOT_EXIST: 'USER_DOES_NOT_EXIST',
    RESET_SUCCESSFUL: 'RESET_SUCCESSFUL',
    RESET_FAILED: 'RESET_FAILED'
});

/*
 {
 "password" : "test",
 "passwordResetToken" : "b00184d0-2adf-11e3-bdae-e739654ae233"
 }
 */
UserManager.prototype.resetPassword = function(userObj, callback){
    // check if email address exists
    orm.model('User').find({
        where: ['passwordResetToken=? AND (userType=? OR userType=?)', userObj.passwordResetToken, 'developer', 'admin']
    }).success(function(user){
            if(!user){
                callback(ResetPasswordEnum.USER_DOES_NOT_EXIST);
            }else{
                bcrypt.hash(userObj.password, 10, function(err, hash) {
                    userObj.password = hash;
                    userObj.passwordResetToken = null;
                    user.updateAttributes(userObj, [ 'password', 'passwordResetToken' ]).success(function(){
                        winston.log('Password reset: user "' + user.email + '" succeeded');
                        callback(ResetPasswordEnum.RESET_SUCCESSFUL);
                    }).error(function(e){
                            winston.error('Password reset: user "' + userObj.email + '" failed: ');
                            callback(ResetPasswordEnum.RESET_FAILED);
                        });
                });
            }
        });
};

module.exports = new UserManager();
module.exports.RegisterGuestStatusEnum = RegisterGuestStatusEnum;
module.exports.ApproveUserStatusEnum = ApproveUserStatusEnum;
module.exports.BecomeDeveloperStatusEnum = BecomeDeveloperStatusEnum;
module.exports.InviteUserStatusEnum = InviteUserStatusEnum;
module.exports.SendForgotPasswordEmailEnum = SendForgotPasswordEmailEnum;
module.exports.ResetPasswordEnum = ResetPasswordEnum;
