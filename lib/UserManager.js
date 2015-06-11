var Enum = require('enum')
, orm = require('./orm')
, fs = require('fs')
, EmailService = require('./EmailService')
, AccountManager = require('../lib/AccountManager')
, ConfigManager = require('../lib/ConfigManager')
, WPOAuthClient = require('../lib/WPOAuthClient')
, bcrypt = require('bcryptjs')
, magnetId = require('node-uuid');

var hasAutologinPath = false;

fs.exists(ConfigManager.autologinConfigPath, function(exists){
    hasAutologinPath = exists;
});

var UserManager = function(){};

UserManager.prototype.checkAuthority = function(types, isAPI, regex, doBasicAuth){
    var me = this;
    return function(req, res, next){
        if(regex && !regex.test(req.url))
            return next();
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
        }else if(hasAutologinPath && !isAPI){
            ConfigManager.getAutoLoginConfig(function(e, obj){
                hasAutologinPath = false;
                if(e){
                    res.redirect('/');
                }else{
                    AccountManager.manualLogin(obj.email, obj.password, function(e, user, newMMXUser){
                        if(user && types.indexOf(user.userType) != -1){
                            delete user.password;
                            req.session.user = user;
                            if(newMMXUser){
                                winston.verbose('Auth: first-time user "' + user.email + '" logged in.');
                                INST_CONFIG.newMMXUser = true;
                            }
                        }
                        res.redirect('/');
                    });
                }
            });
        }else if(doBasicAuth === true && req.headers['authorization']){
            var creds = me.getBasicAuth(req.headers['authorization']);
            if(creds){
                AccountManager.manualLogin(creds.username, creds.password, function(e, user){
                    if(user && types.indexOf(user.userType) != -1){
                        req._basicAuthUser = user;
                        next();
                    }else{
                        res.send(e || 'invalid-login', 401);
                    }
                });
            }else{
                res.send('invalid-login', 401);
            }
        }else if(req.session.user && req.session.user.activated == false){
            if(isAPI){
                res.send('account-locked', 279);
            }else{
                req.session.entryPoint = req.url;
                res.redirect('/?status=locked');
            }
        }else{
            if(isAPI){
                res.send('session-expired', 278);
            }else{
                req.session.entryPoint = req.url;
                if(ENV_CONFIG.WPOAuth && ENV_CONFIG.WPOAuth.enabled){
                    res.redirect(WPOAuthClient.getAuthCodeUrl());
                }else{
                    res.redirect('/');
                }
            }
        }
    }
};

UserManager.prototype.getBasicAuth = function(header){
    var token, auth, parts = [];
    if(header){
        token = (header.split(/\s+/).pop() || '');
        auth = new Buffer(token, 'base64').toString();
        parts = auth.split(/:/);
    }
    return parts.length == 2 ? {
        username : parts[0],
        password : parts[1]
    } : false;
}

// create user
UserManager.prototype.create = function(userObj, callback){
    if(userObj){
        orm.model('User').find({
            where : {
                email : userObj.email
            }
        }).then(function(user){
            if(!user){
                bcrypt.hash(userObj.password, 10, function(err, hash){
                    userObj.password = hash;
                    orm.model('User').create(userObj).then(function(user){
                        callback(null, user);
                    }).catch(function(e){
                        winston.error('User: user creation of "' + userObj.email + '" failed: ', e);
                        callback('create-user-failed');
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

// get user information by magnetId
UserManager.prototype.read = function(magnetId, notAuth, callback){
    var attributes = notAuth ? ['email'] : ['id', 'magnetId', 'email', 'firstName', 'lastName', 'companyName', 'country', 'roleWithinCompany', 'userType', 'inviterId'];
    orm.model('User').find({
        where      : {
            magnetId : magnetId
        },
        attributes : attributes
    }).then(function(user){
        if(user){
            callback(null, user);
        }else{
            callback('user-not-exist');
        }
    }).catch(function(){
        callback('user-fetch-failed');
    });
};

// get user information by id
UserManager.prototype.readById = function(id, callback){
    orm.model('User').find({
        where : {
            id : id
        },
        attributes : ['id', 'magnetId', 'email', 'firstName', 'lastName', 'companyName', 'country', 'roleWithinCompany', 'userType']
    }).then(function(user){
        if(user){
            callback(null, user);
        }else{
            callback('user-not-exist');
        }
    }).catch(function(){
        callback('user-fetch-failed');
    });
};

// update user
UserManager.prototype.update = function(sessionUser, userObj, callback){
    var me = this, where = {
        magnetId : sessionUser
    };
    if(typeof sessionUser == 'object')
        where = {
            email : sessionUser.email
        };
    // check if email address exists
    orm.model('User').find({
        where : where
    }).then(function(user){
        if(user){
            me.checkRemainingAdmins(user, userObj, function(e){
                if(e) return callback(e);
                // update user details
                user.firstName = userObj.firstName || user.firstName;
                user.lastName = userObj.lastName || user.lastName;
                user.companyName = userObj.companyName || user.companyName;
                user.activated = (userObj.activated === true || userObj.activated === false) ? userObj.activated : user.activated;
                user.roleWithinCompany = userObj.roleWithinCompany || user.roleWithinCompany;
                user.userType = userObj.userType || user.userType;
                if(userObj.newpass && userObj.newpass.length > 0){
                    bcrypt.compare(userObj.oldpass, user.password, function(err, isPasswordCorrect) {
                        if (isPasswordCorrect) {
                            bcrypt.hash(userObj.newpass, 10, function(err, hash) {
                                user.password = hash;
                                user.save().then(function(){
                                    callback(null, user);
                                }).catch(function(e){
                                    winston.error('Accounts: user "' + sessionUser.email + '" update failed: ', e);
                                    callback('error-updating-user');
                                });
                            });
                        }else{
                            winston.error('Accounts: user "' + sessionUser.email + '" update failed: old-pass-not-match');
                            callback('old-pass-not-match');
                            return false;
                        }
                    });
                }else{
                    user.save().then(function(){
                        callback(null, user);
                    }).catch(function(e){
                        winston.error('Accounts: user "' + sessionUser.email + '" update failed: ', e);
                        callback('error-updating-user');
                    });
                }
            });
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
            }, ['activated']).then(function(){
                    callback(null, user);
                }).catch(function(e){
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
    var me = this;
    this.read(magnetId, false, function(e, user){
        if(user){
            me.checkRemainingAdmins(user, null, function(e){
                if(e) return callback(e);
                user.destroy().then(function(){
                    winston.verbose('User: deletion of single user (' + magnetId + ') succeeded.');
                    callback(null, user);
                }).catch(function(e){
                    winston.error('User: deletion of single user (' + magnetId + ' failed: ', e);
                    callback('user-delete-error');
                });
            });
        }else{
            callback(e);
        }
    });
};

UserManager.prototype.checkRemainingAdmins = function(originalUser, editedUser, callback){
    if(!originalUser || originalUser.userType != 'admin') return callback();
    if(editedUser && ((!editedUser.userType && typeof editedUser.activated === 'undefined') || (editedUser.userType == 'admin' && editedUser.activated))) return callback();
    orm.model('User').count({
        where : ['userType = "admin" AND activated = 1']
    }).then(function(count){
        if(count <= 1) return callback('validation-error');
        callback();
    }).catch(function(e){
        winston.error('User: error retrieving admin count: ', e);
        callback('validation-error');
    });
};


var RegisterGuestStatusEnum = new Enum({
    USER_ALREADY_EXISTS     : 'USER_ALREADY_EXISTS',
    REGISTRATION_FAILED     : 'REGISTRATION_FAILED',
    REGISTRATION_SUCCESSFUL : 'REGISTRATION_SUCCESSFUL'
});

UserManager.prototype.registerGuest = function(userObj, isInvitedByAdmin, callback){
    var me = this;
    // check if email address exists
    orm.model('User').find({
        where : {
            email : userObj.email
        }
    }).then(function(user){
        userObj.email = userObj.email.toLowerCase();
        if(!user){
            userObj.userType = 'approved';
            // Was this user invited?
            if(!userObj.magnetId){
                // Generate the User UUID
                userObj.magnetId = magnetId.v1();
                orm.model('User').create(userObj, ['magnetId', 'firstName', 'lastName', 'email', 'companyName', 'userType', 'inviterId', 'invitedEmail' ]).then(function(user){
                    winston.verbose('Registration: user "' + userObj.email + '" created');
                    me.sendCompleteRegistrationEmail(user, isInvitedByAdmin, function(e){
                        if(e){
                            me.delete(userObj.magnetId, function(){
                                callback(e);
                            });
                        }else{
                            callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                        }
                    }, userObj.source);
                }).catch(function(e){
                    winston.error('Registration: user "' + userObj.email + '" failed: ', e);
                    callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
                });
            }else{
                orm.model('User').find({
                    where : {
                        magnetId : userObj.magnetId,
                        userType : 'invited'
                    }
                }).then(function(invitedUser){
                    if(invitedUser){
                        invitedUser.updateAttributes(userObj, [ 'firstName', 'lastName', 'email', 'companyName', 'userType']).then(function(user){
                            winston.verbose('Registration: user "' + userObj.email + '" succeeded');
                            callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                            me.sendCompleteRegistrationEmail(user, isInvitedByAdmin, null, userObj.source);
                        }).catch(function(e){
                            winston.error('Registration: user "' + userObj.email + '" failed: ', e);
                            callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
                        });
                    }else{
                        winston.error('Registration: user "' + userObj.email + '" failed: invalid magnetId');
                        callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
                    }
                });
            }
        }else{
            callback(RegisterGuestStatusEnum.USER_ALREADY_EXISTS, user);
        }
    });
};

var ApproveUserStatusEnum = new Enum({
    USER_DOES_NOT_EXIST : 'USER_DOES_NOT_EXIST',
    APPROVAL_FAILED     : 'APPROVAL_FAILED',
    APPROVAL_SUCCESSFUL : 'APPROVAL_SUCCESSFUL'
});

UserManager.prototype.approveUser = function(userObj, isInvitedByAdmin, callback){
    var me = this;
    // check if magnetId exists
    orm.model('User').find({
        where : ['magnetId=? AND (userType=? OR userType=?)', userObj.magnetId, 'guest', 'approved']
    }).then(function(user){
        if(user){
            winston.verbose('Approval: user "' + user.email + '" fetched successfully');
            user.updateAttributes({userType: 'approved'}, {fields: [ 'userType' ]}).then(function(){
                if(userObj.invitedBy){
                    winston.info('Approval: user "'+userObj.invitedBy.email+'"('+userObj.invitedBy.id+') approved user "'+user.email+'"('+user.id+') using "'+(isInvitedByAdmin ? 'admin email invite' : 'admin page approval')+'" successfully at: '+new Date(), {
                        userId      : userObj.invitedBy.id,
                        targetModel : 'User',
                        targetId    : user.id
                    });
                }
                me.sendCompleteRegistrationEmail(user, isInvitedByAdmin, function(e){
                    if(e){
                        me.delete(userObj.magnetId, function(){
                            callback(e);
                        });
                    }else{
                        callback(e ? ApproveUserStatusEnum.APPROVAL_FAILED : ApproveUserStatusEnum.APPROVAL_SUCCESSFUL, user);
                    }
                });
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
UserManager.prototype.sendCompleteRegistrationEmail = function(user, isInvitedByAdmin, callback, source){
    var extra = isInvitedByAdmin ? 's=w' : 's=u';
    ConfigManager.get('App', function(){
        EmailService.sendEmail({
            to      : user.email,
            subject : 'Activate Your Magnet Message Account',
            html    : EmailService.renderTemplate({
                main : 'Basic-Template',
                sub  : 'Invite-Confirmation',
                vars : {
                    emailTitle  : 'Your Activation',
                    resourceUrl : ENV_CONFIG.App.appUrl+'/resources',
                    url         : ENV_CONFIG.App.appUrl+'/#/complete-register?' + extra + '&t=' + user.magnetId
                }
            }),
            success : function(){
                winston.verbose('User: Complete Registration email sent to '+user.email);
                if(typeof callback === typeof Function) callback();
            },
            error : function(e){
                winston.error('User: Failed to send Invite-Confirmation email: ', e);
                if(typeof callback === typeof Function) callback('error-sending-email');
            }
        });
    });
};

var BecomeDeveloperStatusEnum = new Enum({
    USER_DOES_NOT_EXIST : 'USER_DOES_NOT_EXIST',
    FAILED              : 'FAILED',
    SUCCESSFUL          : 'SUCCESSFUL'
});

UserManager.prototype.becomeDeveloper = function(userObj, callback){
    // check if magnetId exists
    orm.model('User').find({
        where : {
            magnetId : userObj.magnetId,
            userType: 'approved'
        }
    }).then(function(user){
        if(user){
            winston.verbose('Approval fetched: user "' + user.email + '" succeeded');
            userObj.userType = 'developer';
            bcrypt.hash(userObj.password, 10, function(err, hash){
                userObj.password = hash;
                userObj.dateAcceptedEULA = new Date();
                winston.info('EULA: user "'+user.email+'"('+user.id+') accepted the EULA at: '+userObj.dateAcceptedEULA, {
                    userId : user.id
                });
                user.updateAttributes(userObj, [ 'userType', 'password', 'roleWithinCompany', 'dateAcceptedEULA', 'country', 'firstName', 'lastName', 'companyName' ]).then(function(){
                    winston.verbose('Became developer: user "' + user.email + '" succeeded');
                    callback(BecomeDeveloperStatusEnum.SUCCESSFUL, user);
                }).catch(function(e){
                    winston.error('Became developer: user "' + user.email + '" failed: ', e);
                    callback(BecomeDeveloperStatusEnum.FAILED, user);
                });
            });
        }else{
            callback(BecomeDeveloperStatusEnum.USER_DOES_NOT_EXIST, user);
        }
    });
};

var SendForgotPasswordEmailEnum = new Enum({
    USER_DOES_NOT_EXIST       : 'USER_DOES_NOT_EXIST',
    COULD_NOT_SET_RESET_TOKEN : 'COULD_NOT_SET_RESET_TOKEN',
    EMAIL_FAILED              : 'EMAIL_FAILED',
    EMAIL_SUCCESSFUL          : 'EMAIL_SUCCESSFUL'
});

UserManager.prototype.sendForgotPasswordEmail = function(userObj, callback){
    // check if email address exists
    orm.model('User').find({
        where: ['email=? AND (userType=? OR userType=?)', userObj.email, 'developer', 'admin']
    }).then(function(user){
        if(!user){
            callback(SendForgotPasswordEmailEnum.USER_DOES_NOT_EXIST);
        }else{
            var passwordResetToken = magnetId.v4();
            userObj.passwordResetToken = passwordResetToken;
            user.updateAttributes(userObj, [ 'passwordResetToken' ]).then(function(){
                winston.verbose('Added password reset token: user "' + user.email + '" succeeded');
                var subject = 'Reset Your Magnet Message Password';
                ConfigManager.get('App', function(){
                    EmailService.sendEmail({
                        to      : user.email,
                        subject : subject,
                        html    : EmailService.renderTemplate({
                            main : 'Basic-Template',
                            sub  : 'Forgot-Password',
                            vars : {
                                emailTitle   : 'Reset Your Password',
                                resourceUrl  : ENV_CONFIG.App.appUrl+'/resources',
                                url          : ENV_CONFIG.App.appUrl+'/#/reset-password?t='+passwordResetToken
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
                });
            }).catch(function(e){
                winston.error('Added password reset token: user "' + userObj.email + '" failed: ', e);
                callback(SendForgotPasswordEmailEnum.COULD_NOT_SET_RESET_TOKEN);
            });
        }
    });
};

var ResetPasswordEnum = new Enum({
    USER_DOES_NOT_EXIST : 'USER_DOES_NOT_EXIST',
    RESET_SUCCESSFUL    : 'RESET_SUCCESSFUL',
    RESET_FAILED        : 'RESET_FAILED'
});

UserManager.prototype.resetPassword = function(userObj, callback){
    // check if email address exists
    orm.model('User').find({
        where: ['passwordResetToken=? AND (userType=? OR userType=?)', userObj.passwordResetToken, 'developer', 'admin']
    }).then(function(user){
        if(!user){
            callback(ResetPasswordEnum.USER_DOES_NOT_EXIST);
        }else{
            bcrypt.hash(userObj.password, 10, function(err, hash) {
                userObj.password = hash;
                userObj.passwordResetToken = null;
                user.updateAttributes(userObj, [ 'password', 'passwordResetToken' ]).then(function(){
                    winston.verbose('Password reset: user "' + user.email + '" succeeded');
                    callback(ResetPasswordEnum.RESET_SUCCESSFUL, user);
                }).catch(function(e){
                    winston.error('Password reset: user "' + userObj.email + '" failed: ');
                    callback(ResetPasswordEnum.RESET_FAILED);
                });
            });
        }
    });
};

// get list of users invited by the given user
UserManager.prototype.getInvitedUsers = function(magnetId, callback){
    this.read(magnetId, false, function(e, user){
        if(user){
            orm.model('User').findAll({
                where      : ['inviterId=?', user.id],
                attributes : ['firstName', 'lastName', 'email', 'invitedEmail', 'createdAt', 'magnetId']
            }).then(function(users){
                callback(null, users);
            }).catch(function(){
                winston.error('User: error retrieving users invited by one particular user: ', e);
                callback('error-retrieving-invited-users');
            });
        }else{
            callback(e);
        }
    });
};

// admin reset password
UserManager.prototype.adminResetPassword = function(userMagnetId, callback){
    var userObj = {};
    var pass = new Buffer(magnetId.v4().replace(/-/g, '')).toString('base64').substring(0, 12);
    this.read(userMagnetId, false, function(e, user){
        if(user){
            bcrypt.hash(pass, 10, function(err, hash){
                userObj.password = hash;
                userObj.passwordResetToken = null;
                user.updateAttributes(userObj, [ 'password', 'passwordResetToken' ]).then(function(){
                    winston.verbose('Password reset: user "' + user.email + '" succeeded');
                    callback(null, pass);
                }).catch(function(e){
                    winston.error('Password reset: user "' + user.email + '" failed: ');
                    callback(ResetPasswordEnum.RESET_FAILED);
                });
            });
        }else{
            callback(e);
        }
    });
};

UserManager.prototype.getSafeUser = function(obj){
    return {
        id         : obj.id,
        email      : obj.email,
        magnetId   : obj.id,
        lastName   : obj.lastName,
        firstName  : obj.firstName,
        userType   : obj.userType,
        newMMXUser : obj.newMMXUser
    }
};

module.exports = new UserManager();
module.exports.RegisterGuestStatusEnum = RegisterGuestStatusEnum;
module.exports.ApproveUserStatusEnum = ApproveUserStatusEnum;
module.exports.BecomeDeveloperStatusEnum = BecomeDeveloperStatusEnum;
module.exports.SendForgotPasswordEmailEnum = SendForgotPasswordEmailEnum;
module.exports.ResetPasswordEnum = ResetPasswordEnum;
