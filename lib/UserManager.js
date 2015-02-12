var Enum = require('enum')
, orm = require('./orm')
, EmailService = require('./EmailService')
, AccountManager = require('./AccountManager')
, bcrypt = require('bcryptjs')
, magnetId = require('node-uuid');

var UserManager = function(){};

UserManager.prototype.checkAuthority = function(types, isAPI, regex, doBasicAuth){
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
        }else if(doBasicAuth === true && req.headers['authorization']){
            var creds = getBasicAuth(req.headers['authorization']);
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
                res.redirect('/');
            }
        }
    }
};

function getBasicAuth(header){
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
        }).success(function(user){
            if(!user){
                bcrypt.hash(userObj.password, 10, function(err, hash){
                    userObj.password = hash;
                    orm.model('User').create(userObj).success(function(user){
                        callback(null, user);
                    }).error(function(e){
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
                user.save().success(function(){
                    callback(null, user);
                }).error(function(e){
                    winston.error('Accounts: user "' + sessionUser.email + '" update failed: ', e);
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
    }).success(function(user){
        userObj.email = userObj.email.toLowerCase();
        if(!user){
            userObj.userType = 'approved';
            // Was this user invited?
            if(!userObj.magnetId){
                // Generate the User UUID
                userObj.magnetId = magnetId.v1();
                orm.model('User').create(userObj, ['magnetId', 'firstName', 'lastName', 'email', 'companyName', 'userType', 'inviterId', 'invitedEmail' ]).success(function(user){
                    winston.verbose('Registration: user "' + userObj.email + '" created');
                    callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                }).error(function(e){
                    winston.error('Registration: user "' + userObj.email + '" failed: ', e);
                    callback(RegisterGuestStatusEnum.REGISTRATION_FAILED, null);
                });
            }else{
                orm.model('User').find({
                    where : {
                        magnetId : userObj.magnetId,
                        userType : 'invited'
                    }
                }).success(function(invitedUser){
                    if(invitedUser){
                        invitedUser.updateAttributes(userObj, [ 'firstName', 'lastName', 'email', 'companyName', 'userType']).success(function(user){
                            winston.verbose('Registration: user "' + userObj.email + '" succeeded');
                            callback(RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL, user);
                            me.sendCompleteRegistrationEmail(user, isInvitedByAdmin, null, userObj.source);
                        }).error(function(e){
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
    }).success(function(user){
        if(user){
            winston.verbose('Approval fetched: user "' + user.email + '" succeeded');
            user.updateAttributes({userType: 'approved'}, [ 'userType' ]).success(function(){
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
UserManager.prototype.sendCompleteRegistrationEmail = function(user, isInvitedByAdmin, callback, source){
    var extra = isInvitedByAdmin ? 's=w' : 's=u';
    ConfigManager.get('App', function(){
        EmailService.sendEmail({
            to      : user.email,
            subject : 'Activate Your Messaging Account',
            html    : EmailService.renderTemplate({
                main : 'email-template',
                sub  : 'invite-confirm-email',
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
                winston.error('User: Failed to send invite-confirm-email email: ', e);
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
    }).success(function(user){
        if(user){
            winston.verbose('Approval fetched: user "' + user.email + '" succeeded');
            userObj.userType = 'developer';
            bcrypt.hash(userObj.password, 10, function(err, hash){
                userObj.password = hash;
                userObj.dateAcceptedEULA = new Date();
                winston.info('EULA: user "'+user.email+'"('+user.id+') accepted the EULA at: '+userObj.dateAcceptedEULA, {
                    userId : user.id
                });
                user.updateAttributes(userObj, [ 'userType', 'password', 'roleWithinCompany', 'dateAcceptedEULA', 'country', 'firstName', 'lastName', 'companyName' ]).success(function(){
                    winston.verbose('Became developer: user "' + user.email + '" succeeded');
                    callback(BecomeDeveloperStatusEnum.SUCCESSFUL, user);
                }).error(function(e){
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
    }).success(function(user){
        if(!user){
            callback(SendForgotPasswordEmailEnum.USER_DOES_NOT_EXIST);
        }else{
            var passwordResetToken = magnetId.v1();
            userObj.passwordResetToken = passwordResetToken;
            user.updateAttributes(userObj, [ 'passwordResetToken' ]).success(function(){
                winston.verbose('Added password reset token: user "' + user.email + '" succeeded');
                var subject = 'Reset Your Messaging Password';
                ConfigManager.get('App', function(){
                    EmailService.sendEmail({
                        to      : user.email,
                        subject : subject,
                        html    : EmailService.renderTemplate({
                            main : 'email-template',
                            sub  : 'forgot-password-email',
                            vars : {
                                emailTitle   : 'Reset Your Password',
                                resourceUrl  : ENV_CONFIG.App.appUrl+'/resources',
                                url          : userObj.source ? (userObj.source+'/messaging/console/#/reset-password?t='+passwordResetToken) : (ENV_CONFIG.App.appUrl+'/resources' + '/account/reset-password?t=' + passwordResetToken)
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
            }).error(function(e){
                winston.error('Added password reset token: user "' + userObj.email + '" failed: ');
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
module.exports.SendForgotPasswordEmailEnum = SendForgotPasswordEmailEnum;
module.exports.ResetPasswordEnum = ResetPasswordEnum;
