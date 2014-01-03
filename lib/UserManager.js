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
        if(req.session.user && types.indexOf(req.session.user.userType) != -1 && req.session.user.activated === true){
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
        }else if(req.session.user && req.session.user.activated == false){
            if(isAPI){
                res.send('account-locked', 279);
            }else{
                req.session.entryPoint = req.url;
                res.redirect('/login?status=locked');
            }
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
    if(userObj){
        orm.model('User').find({
            where : {
                email : userObj.email
            }
        }).success(function(user){
            if(!user || !userObj.email){
                bcrypt.hash(userObj.password, 10, function(err, hash) {
                    userObj.password = hash;
                    var userMagnetId = userObj.magnetId || magnetId.v1();
                    // Generate license
                    License.sign(userMagnetId, function(signature){
                        userObj.magnetId = userMagnetId;
                        userObj.signedLicenseKey = signature;
                        orm.model('User').create(userObj).success(function(user){
                            callback(null, user);
                        }).error(function(e){
                            winston.error('User: user creation of "' + userObj.email + '" failed: ', e);
                            callback('create-user-failed');
                        });
                    });
                });
            }else{
                winston.error('User: user creation of "' + userObj.email + '" failed: user already exists');
                callback('user-exists', user);
            }
        });
    }else{
        callback('invalid-user-object');
    }
};

// create cloud account
UserManager.prototype.createCloudAccount = function(user, accessKeyId, secretAccessKey, callback){
    var provider = 'AWS', cloudAccountObj = orm.model('CloudAccount').build({
        magnetId        : magnetId.v1(),
        ownerType       : 'User',
        name            : user.email + "'s " + provider + " Account",
        provider        : provider,
        bucketName      : user.magnetId,
        accessKeyId     : accessKeyId,
        secretAccessKey : secretAccessKey
    });
    user.addCloudAccount(cloudAccountObj).success(function(cloudAccount){
        winston.verbose('Successfully created cloud account for "' + user.email + '"');
        callback(null, cloudAccount);
    }).error(function(e){
        winston.error('User: creation of cloud account for "' + user.email + '" failed: ', e);
        callback('create-cloud-account-failed');
    });
}

// get user information by magnetId
UserManager.prototype.read = function(magnetId, notAuth, callback){
    var attributes = notAuth ? ['email'] : ['id', 'magnetId', 'email', 'firstName', 'lastName', 'companyName', 'country', 'roleWithinCompany', 'userType', 'inviterId'];
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

// get user information by id
UserManager.prototype.readById = function(id, callback){
    // check if magnetId exists
    orm.model('User').find({
        where : {
            id : id
        },
        attributes : ['id', 'magnetId', 'email', 'firstName', 'lastName', 'companyName', 'country', 'roleWithinCompany', 'userType']
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
                                winston.error('Accounts: user "' + sessionUser.email + '" update failed: ' + e);
                                callback('error-updating-user');
                            });
                        });
                    } else {
                        winston.error('Accounts: user "' + sessionUser.email + '" update failed: old-pass-not-match');
                        callback('old-pass-not-match');
                        return false;
                    }
                });
            } else {
                user.save().success(function(){
                    callback(null, user);
                }).error(function(e){
                    winston.error('Accounts: user "' + sessionUser.email + '" update failed: ' + e);
                    callback('error-updating-user');
                });
            }
        }else{
            winston.error('Accounts: user "' + sessionUser.email + '" update failed: ' + 'user-not-found');
            callback('user-not-found');
        }
    });
};


// update user
UserManager.prototype.setActivation = function(magnetId, isActivated, callback){
    this.read(magnetId, false, function(e, user){
        if(user){
            user.updateAttributes({
                activated : isActivated
            }, ['activated']).success(function(){
                callback(null, user);
            }).error(function(e){
                winston.error('Accounts: user "' + user.email + '" activation state change to activated:'+isActivated+' failed: ', e);
                callback('error-updating-user');
            });
        }else{
            callback(e);
        }
    });
};

/* DELETE */

// delete a single user
UserManager.prototype.delete = function(magnetId, callback){
    this.read(magnetId, false, function(e, user){
        if(user){
            user.destroy().success(function(){
                winston.verbose('User: deletion of single user (' + magnetId + ') succeeded.');
                callback(null, user);
            }).error(function(e){
                winston.error('User: deletion of single user (' + magnetId + ' failed: ', e);
                callback('user-delete-error');
            });
        }else{
            callback(e);
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
UserManager.prototype.registerGuest = function(userObj, isInvitedByAdmin, callback){
    var me = this;
    // check if email address exists
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).success(function(user){
        if (!user) {
            userObj.userType = APP_CONFIG.skipAdminApproval === true ? 'approved' : 'guest';
            // Was this user invited?
            if (!userObj.magnetId) {
                // Generate the User UUID
                userObj.magnetId = magnetId.v1();
                orm.model('User').create(userObj, [ 'magnetId', 'firstName', 'lastName', 'email', 'companyName', 'userType', 'inviterId', 'invitedEmail' ]).success(function(user){
                    winston.verbose('Registration: user "' + userObj.email + '" succeeded');
                    callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                    // Send email to Magnet Admin
                    if (!isInvitedByAdmin) {
                        // Send email
                        if(APP_CONFIG.skipAdminApproval === true){
                            me.sendCompleteRegistrationEmail(user, isInvitedByAdmin);
                        }else{
                            UserManager.prototype.sendAdminEmail(userObj.firstName, userObj.lastName, userObj.email);
                        }
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
                            winston.verbose('Registration: user "' + userObj.email + '" succeeded');
                            callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                            // Send email to Magnet Admin
                            if (!isInvitedByAdmin && APP_CONFIG.skipAdminApproval !== true) {
                                // Send email
                                UserManager.prototype.sendAdminEmail(userObj.firstName, userObj.lastName, userObj.email);
                            }else if(APP_CONFIG.skipAdminApproval === true){
                                me.sendCompleteRegistrationEmail(user, isInvitedByAdmin);
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
    orm.model('User').findAll({
        where : {
            userType : 'admin'
        },
        attributes : ['email']
    }).success(function(admins){
        for(var i=admins.length;i--;){
            EmailService.sendEmail({
                to      : admins[i].email,
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
//                        winston.verbose("")
                },
                error : function(e){
                    winston.error("Failed to send %s email", subject);
                }
            });
        }
    });
};

var ApproveUserStatusEnum = new Enum({
    USER_DOES_NOT_EXIST: 'USER_DOES_NOT_EXIST',
    APPROVAL_FAILED: 'APPROVAL_FAILED',
    APPROVAL_SUCCESSFUL: 'APPROVAL_SUCCESSFUL'
});

UserManager.prototype.approveUser = function(userObj, isInvitedByAdmin, callback){
    var me = this;
    // check if magnetId exists
    orm.model('User').find({
        where : ['magnetId=? AND (userType=? OR userType=?)', userObj.magnetId, 'guest', 'approved']
    }).success(function(user){
        if(user){
            winston.verbose('Approval fetched: user "' + user.email + '" succeeded');
            user.updateAttributes({userType: 'approved'}, [ 'userType' ]).success(function(){
                if(userObj.invitedBy){
                    winston.info('Approval: user "'+userObj.invitedBy.firstName+' '+userObj.invitedBy.lastName+'"('+userObj.invitedBy.id+') approved user "'+(user.firstName ? user.firstName+' '+user.lastName : user.email)+'"('+user.id+') using "'+(isInvitedByAdmin ? 'admin email invite' : 'admin page approval')+'" successfully at: '+new Date(), {
                        userId      : userObj.invitedBy.id,
                        targetModel : 'User',
                        targetId    : user.id
                    });
                }
                me.sendCompleteRegistrationEmail(user, isInvitedByAdmin, function(e){
                    callback(e ? ApproveUserStatusEnum.APPROVAL_FAILED : ApproveUserStatusEnum.APPROVAL_SUCCESSFUL, user);
                });
            }).error(function(e){
                winston.error('Approval: user "' + user.email + '" failed: ', e);
                callback(ApproveUserStatusEnum.APPROVAL_FAILED, user);
            });
        }else{
            callback(ApproveUserStatusEnum.USER_DOES_NOT_EXIST, user);
        }
    });
};

// Send complete registration email to user
UserManager.prototype.validateAndSendCompleteRegistrationEmail = function(magnetId, callback){
    var me = this;
    me.read(magnetId, false, function(e, user){
        if(user){
            if(user.userType == 'approved'){
                if(user.inviterId){
                    me.readById(user.inviterId, function(e, inviter){
                        if(e){
                            callback('inviter-not-found');
                        }else{
                            me.sendCompleteRegistrationEmail(user, inviter.userType == 'admin', callback);
                        }
                    });
                }else{
                    me.sendCompleteRegistrationEmail(user, false, callback);
                }
            }else{
                winston.error('User: cannot send complete registration email: user is not of type "approved".');
                callback('not-approved-user');
            }
        }else{
            callback(e);
        }
    });
}

// Send complete registration email to user
UserManager.prototype.sendCompleteRegistrationEmail = function(user, isInvitedByAdmin, callback){
    var extra = isInvitedByAdmin ? 's=w' : 's=u';
    EmailService.sendEmail({
        to      : user.email,
        subject : 'Activate Your Magnet Developer Factory Account',
        html    : EmailService.renderTemplate({
            main : 'basic_square',
            sub  : 'invite-confirm-email',
            vars : {
                emailTitle  : 'Your Activation',
                resourceUrl : ENV_CONFIG.Email.resourceUrl,
                url         : ENV_CONFIG.Email.appUrl + '/login/?a=confirm-registration&' + extra + '&t=' + user.magnetId
            }
        }),
        success : function(){
            winston.verbose('User: Complete Registration email sent to '+user.email);
            if(typeof callback === typeof Function) callback();
        },
        error : function(e){
            winston.error('User: Failed to send invite-confirm-email email: ', e);
            if(typeof callback === typeof Function) callback('error-sending-email');
        }
    });
}

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

                winston.verbose('Approval fetched: user "' + user.email + '" succeeded');

                userObj.userType = 'developer';
                bcrypt.hash(userObj.password, 10, function(err, hash) {
                    userObj.password = hash;
                    userObj.dateAcceptedEULA = new Date();

                    winston.info('EULA: user "'+(user.firstName ? user.firstName+' '+user.lastName : userObj.firstName+' '+userObj.lastName)+'"('+user.id+') accepted the EULA at: '+userObj.dateAcceptedEULA, {
                        userId : user.id
                    });

                    // Generate license
                    License.sign(user.magnetId, function(signature) {
                        userObj.signedLicenseKey = signature;
                        user.updateAttributes(userObj, [ 'userType', 'password', 'roleWithinCompany', 'dateAcceptedEULA', 'country', 'firstName', 'lastName', 'companyName', 'signedLicenseKey' ]).success(function(){
                            winston.verbose('Became developer: user "' + user.email + '" succeeded');

                            // Create Cloud Account
                            var cloudAccountMagnetId = magnetId.v1();

                            Cloud.allocateCloudAccount(user.magnetId, function(err, data) {
                                if (err) {
                                    winston.error("Error creating keys for " + user.email +" with error: ", err);
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
                                        winston.verbose("Successfully created cloud account");
                                        callback(BecomeDeveloperStatusEnum.SUCCESSFUL, user);
                                    }).error(function (error) {
                                        winston.error("Error creating cloud account for " + user.email +" with error: ", error);
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
                    winston.verbose('User to User invitation: user "' + userObj.invitedEmail + '" succeeded');

                    // Send email to User
                    var subject = firstName+' has invited you to the Magnet Developer Factory';
                    var extra = 's=w';
                    EmailService.sendEmail({
                        to      : user.invitedEmail,
                        subject : subject,
                        html    : EmailService.renderTemplate({
                            main : 'basic_square',
                            sub  : 'user-invite-user',
                            vars : {
                                introduceMsg : introduceMsg,
                                firstName    : firstName,
                                lastName     : lastName,
                                emailTitle   : 'Your Invitation',
                                resourceUrl  : ENV_CONFIG.Email.resourceUrl,
                                url          : ENV_CONFIG.Email.appUrl + '/login/?a=confirm-introduce&' + extra + '&t=' + user.magnetId
                            }
                        }),
                        success : function(){
                            callback(InviteUserStatusEnum.INVITATION_SUCCESSFUL, user);
                        },
                        error : function(e){
                            winston.error("Failed to send %s email", subject);
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
                    winston.verbose('Added password reset token: user "' + user.email + '" succeeded');
                    // Send email to User
                    var subject = 'Reset Your Magnet Developer Factory Password';
                    EmailService.sendEmail({
                        to      : user.email,
                        subject : subject,
                        html    : EmailService.renderTemplate({
                            main : 'basic_square',
                            sub  : 'forgot-password-email',
                            vars : {
                                emailTitle   : 'Reset Your Password',
                                resourceUrl  : ENV_CONFIG.Email.resourceUrl,
                                url          : ENV_CONFIG.Email.appUrl + '/login/?a=reset-password&t=' + passwordResetToken
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
                        winston.verbose('Password reset: user "' + user.email + '" succeeded');
                        callback(ResetPasswordEnum.RESET_SUCCESSFUL, user);
                    }).error(function(e){
                            winston.error('Password reset: user "' + userObj.email + '" failed: ');
                            callback(ResetPasswordEnum.RESET_FAILED);
                        });
                });
            }
        });
};

// get cloud accounts for a user
UserManager.prototype.getCloudAccounts = function(magnetId, callback){
    this.read(magnetId, false, function(e, user){
        if(user){
            user.getCloudAccounts().success(function(cloudAccounts){
                callback(null, cloudAccounts);
            });
        }else{
            callback(e);
        }
    });
}

// get list of users invited by the given user
UserManager.prototype.getInvitedUsers = function(magnetId, callback){
    this.read(magnetId, false, function(e, user){
        if(user){
            orm.model('User').findAll({
                where      : ['inviterId=?', user.id],
                attributes : ['firstName', 'lastName', 'email', 'invitedEmail', 'createdAt', 'magnetId']
            }).success(function(users){
                callback(null, users);
            }).error(function(){
                winston.error('User: error retrieving users invited by one particular user: ', e);
                callback('error-retrieving-invited-users');
            });
        }else{
            callback(e);
        }
    });
}

module.exports = new UserManager();
module.exports.RegisterGuestStatusEnum = RegisterGuestStatusEnum;
module.exports.ApproveUserStatusEnum = ApproveUserStatusEnum;
module.exports.BecomeDeveloperStatusEnum = BecomeDeveloperStatusEnum;
module.exports.InviteUserStatusEnum = InviteUserStatusEnum;
module.exports.SendForgotPasswordEmailEnum = SendForgotPasswordEmailEnum;
module.exports.ResetPasswordEnum = ResetPasswordEnum;
