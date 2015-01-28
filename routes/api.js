var AccountManager = require('../lib/AccountManager')
    , UserManager = require('../lib/UserManager')
    , ModelManager = require('../lib/ModelManager')
    , MMXManager = require('../lib/MMXManager')
    , EmailService = require('../lib/EmailService')
    , magnetId = require('node-uuid')
    , Jobs = require('../lib/Jobs')
    , path = require('path')
    , http = require('http')
    , fs = require('fs')
    , _ = require('underscore')
    , validator = require('validator')
    , sanitize = validator.sanitize
    , recaptcha = require('simple-recaptcha')
    , ContentManagement = require('../lib/ContentManagement')
    , packageJSON = require('../package.json');

module.exports = function(app){

    // allow CORS
    app.all('*', function(req, res, next) {
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Expose-Headers', 'Set-Cookie, Cache-Control, X-New-MMX-User');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'appId, X-Requested-With, Accept, Origin, Referer, User-Agent, Content-Type, Authorization, X-Mindflash-SessionID, Geolocation, X-Magnet-Device-Id, X-Magnet-Correlation-id, X-Magnet-Auth-Challenge, X-Magnet-Result-Timeout, Cookie, X-NEW-MMX-USER');
        if('OPTIONS' == req.method){
            res.send(200);
        }else{
            next();
        }
    });

    /* AUTHENTICATION */

    // user log in and store to session and cookie
    app.post('/login', function(req, res){
        AccountManager.manualLogin(req.body.username, req.body.password, function(e, user, newMMXUser){
            // if login returns a user object, store to session
            if(user){
                delete user.password;
                req.session.user = user;
                if(newMMXUser) res.header('X-New-MMX-User', 'enabled');
                winston.verbose('Tracking: user "' + user.email + '" logged in'+ (req.session.entryPoint ? ' with redirect to '+req.session.entryPoint : ''));
                res.redirect((req.session.entryPoint && req.session.entryPoint.indexOf('login') == -1) ? req.session.entryPoint : '/');
            }else if(e == 'account-locked'){
                res.redirect('/?status=locked');
            }else{
                res.redirect('/?status=invalid');
            }
        });
    });

    app.post('/rest/login', function(req, res){
        AccountManager.manualLogin(req.body.name, req.body.password, function(e, user, newMMXUser){
            if(user){
                delete user.password;
                req.session.user = user;
                if(newMMXUser) res.header('X-New-MMX-User', 'enabled');
                winston.verbose('Tracking: user "' + user.email + '" logged in.');
                res.send(req.query.requireUser ? req.session.user.magnetId : 'SUCCESS', 200);
            }else{
                res.send(e, 401);
            }
        });
    });

    // logout user
    app.all('/logout', function(req, res){
        if(!req.session.user){
            res.redirect('/');
        }else{
            winston.verbose('Tracking: user "' + req.session.user.email + '" logged out');
            req.session.destroy(function(){
                res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                res.redirect('back');
            });
        }
    });

    // api style user logout
    app.all('/rest/logout', function(req, res){
        if(!req.session.user){
            res.send('ok', 200);
        }else{
            winston.verbose('Tracking: user "' + req.session.user.email + '" logged out');
            req.session.destroy(function(){
                res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                res.send('ok', 200);
            });
        }
    });

    /* catch database models */
    var getDBModels = ['users', 'projects', 'events', 'announcements'];
    app.get('/rest/:model', function(req, res, next){
        if(req.session.user && req.session.user.userType == 'admin' && _.contains(getDBModels, req.params.model)){
            ModelManager.findAll(req, function(col){
                res.send(col, 200);
            });
        }else{
            next();
        }
    });

    app.get('/rest/:model/:id', function(req, res, next){
        if(req.session.user && req.session.user.userType == 'admin' && _.contains(getDBModels, req.params.model)){
            ModelManager.find(req, function(model){
                res.send(model, 200);
            });
        }else{
            next();
        }
    });

    var putDBModels = ['users', 'announcements'];
    app.put('/rest/:model/:id', function(req, res, next){
        if(req.session.user && req.session.user.userType == 'admin' && _.contains(putDBModels, req.params.model)){
            ModelManager.update(req, req.body, function(e, model){
                if(e){
                    res.send(e, 400);
                }else{
                    res.send('ok', 200);
                }
            });
        }else{
            next();
        }
    });

    var postDBModels = ['announcements'];
    app.post('/rest/:model', function(req, res, next){
        if(req.session.user && req.session.user.userType == 'admin' && _.contains(postDBModels, req.params.model)){
            ModelManager.create(req, req.body, function(e, model){
                if(e){
                    res.send(e, 400);
                }else{
                    res.send(model, 201);
                }
            });
        }else{
            next();
        }
    });

    var deleteDBModels = ['announcements'];
    app.delete('/rest/:model/:id', function(req, res, next){
        if(req.session.user && req.session.user.userType == 'admin' && _.contains(deleteDBModels, req.params.model)){
            ModelManager.delete(req, function(e){
                if(e){
                    res.send(e, 400);
                }else{
                    res.send('ok', 200);
                }
            });
        }else{
            next();
        }
    });

    /* USER */

    app.get('/rest/profile', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        UserManager.read(req.session.user.magnetId, false, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                if(req.session.user.newMMXUser === true){
                    req.session.user.newMMXUser = false;
                    res.send(_.extend(user, {'newMMXUser':true}), 200);
                }else{
                    res.send(user, 200);
                }
            }
        });
    });

    app.put('/rest/profile', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        var newPassword = req.body.newpassword;
        UserManager.update(req.session.user, {
            firstName   : stripChars(req.body.firstName),
            lastName    : stripChars(req.body.lastName),
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            oldpass     : req.body.oldpassword,
            newpass     : newPassword
        }, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                req.session.user = user;
                res.send('ok', 200);
            }
        });
    });

    app.post('/rest/apps', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.createApp(req.session.user.email, req.session.user.magnetId, req.body, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getApps(req.session.user.magnetId, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/stats', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getStats(req.session.user.magnetId, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/configs', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getConfigs(req.session.user.id, function(e, configs){
            if(e){
                res.send(e, 400);
            }else{
                res.send(configs, 200);
            }
        });
    });

    app.get('/rest/apps/:id', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getApp(req.session.user.magnetId, req.params.id, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.put('/rest/apps/:id', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.updateApp(req.session.user.magnetId, req.session.user.userType === 'admin', req.params.id, req.body, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.delete('/rest/apps/:id', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.deleteApp(req.session.user.magnetId, req.session.user.userType === 'admin', req.params.id, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/:id/messages', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getAppMessages(req.session.user.id, req.params.id, req.query, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/:id/stats', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getAppStats(req.session.user.magnetId, req.params.id, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/:id/endpoints', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getAppEndpoints(req.session.user.id, req.params.id, req.query, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/:id/users', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getAppUsers(req.session.user.id, req.params.id, req.query, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/:id/users/:uid/devices', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getAppUserDevices(req.session.user.id, req.params.id, req.params.uid, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.post('/rest/apps/:id/endpoints/:did/message', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.sendMessage(req.session.user.id, req.params.id, req.params.did, req.body, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.post('/rest/apps/:id/endpoints/:did/ping', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.sendPing(req.session.user.id, req.params.id, req.params.did, req.body, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.post('/rest/apps/:id/endpoints/:did/notification', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.sendNotification(req.session.user.id, req.params.id, req.params.did, req.body, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/:id/devices/:did/messages', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getDeviceMessages(req.session.user.id, req.params.id, req.params.did, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.get('/rest/apps/:id/topics', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.getAppTopics(req.session.user.id, req.params.id, req.query, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.post('/rest/apps/:id/topics', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.createAppTopic(req.session.user.id, req.params.id, req.body, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.delete('/rest/apps/:id/topics/:tid', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.deleteAppTopic(req.session.user.id, req.params.id, req.params.tid, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.post('/rest/apps/:id/topics/:tid/publish', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        MMXManager.publishToTopic(req.session.user.id, req.params.id, req.params.tid, req.body, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    function isAuthenticated(req){
        return (req.session && req.session.user && req.session.user.activated === true && (req.session.user.userType == 'admin' || req.session.user.userType == 'developer')) || false;
    }

    function debugOverride(str){
        return str === 'captcha-override';
    }

    app.post('/rest/startRegistration', function(req, res){
        if(isAuthenticated(req) === false && ENV_CONFIG.reCAPTCHA.enabled === true && !debugOverride(req.body.recaptcha_response_field) && !req.body.magnetId){
            if(!req.body.recaptcha_challenge_field || !req.body.recaptcha_response_field){
                res.send('captcha-failed', 400);
            }else{
                recaptcha(ENV_CONFIG.reCAPTCHA.privateKey, req.ip, req.body.recaptcha_challenge_field, req.body.recaptcha_response_field, function(e){
                    if(e){
                        res.send('captcha-failed', 400);
                    }else{
                        registerGuest(req, res);
                    }
                });
            }
        }else{
            registerGuest(req, res);
        }
    });

    function registerGuest(req, res){
        UserManager.registerGuest({
            firstName : stripChars(req.body.firstName),
            lastName : stripChars(req.body.lastName),
            email : req.body.email,
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            magnetId: req.body.magnetId,
            source : sanitize(req.body.source).xss()
        }, false, function(registrationStatus) {
            if(registrationStatus == UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL) {
                res.send({
                    status            : registrationStatus,
                    skipAdminApproval : req.body.source ? true : ENV_CONFIG.App.skipAdminApproval
                }, 201);
            } else {
                res.send(registrationStatus, 400);
            }
        });
    }

    app.put('/rest/users/:magnetId/approve', UserManager.checkAuthority(['admin'], true), function(req, res) {
        UserManager.approveUser({
            magnetId  : req.param('magnetId'),
            invitedBy : req.session.user
        }, false, function(approvalStatus) {
            if(approvalStatus == UserManager.ApproveUserStatusEnum.APPROVAL_SUCCESSFUL) {
                res.send(approvalStatus, 200);
            } else {
                res.send(approvalStatus, 400);
            }
        });
    });

    app.post('/rest/users/:magnetId/completeRegistration', function(req, res) {
        var password = req.body.password;
        UserManager.becomeDeveloper({
            magnetId : req.param('magnetId'),
            password : password,
            firstName : req.body.firstName ? stripChars(req.body.firstName) : req.body.firstName,
            lastName : req.body.lastName ? stripChars(req.body.lastName) : req.body.lastName,
            roleWithinCompany : sanitize(req.body.roleWithinCompany).xss(),
            country : sanitize(req.body.country).xss(),
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName
        }, function(approvalStatus, user) {
            if(approvalStatus == UserManager.BecomeDeveloperStatusEnum.SUCCESSFUL) {
                res.send(approvalStatus, 200);
            } else {
                res.send(approvalStatus, 400);
            }
        });
    });

    app.get('/rest/users/:magnetId', function(req, res){
        // if there is a session, only allow retrieval if user is an admin or the user is retrieving self
        if((req.session.user && (req.session.user.magnetId == req.params.magnetId || req.session.user.userType == 'admin')) || typeof req.session.user == 'undefined'){
            UserManager.read(req.params.magnetId, (typeof req.session.user == 'undefined'), function(e, user){
                if(e){
                    res.send(e, 400);
                }else{
                    res.send(user, 200);
                }
            });
        }else{
            res.send('user-fetch-failed', 400);
        }
    });

    app.delete('/rest/users/:magnetId', UserManager.checkAuthority(['admin'], true), function(req, res){
        UserManager.delete(req.params.magnetId, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                if(user){
                    winston.info('User: user "'+req.session.user.firstName+' '+req.session.user.lastName+'"('+req.session.user.id+') deleted user "'+(user.firstName ? user.firstName+' '+user.lastName : user.email)+'"('+user.id+') successfully at: '+new Date(), {
                        userId      : req.session.user.id,
                        targetModel : 'User',
                        targetId    : user.id
                    });
                }
                res.send('ok', 200);
            }
        });
    });

    app.get('/rest/users/:magnetId/invites', UserManager.checkAuthority(['admin'], true), function(req, res){
        UserManager.getInvitedUsers(req.params.magnetId, function(e, users){
            if(e){
                res.send(e, 400);
            }else{
                res.send(users, 200);
            }
        });
    });

    app.get('/rest/users/:magnetId/apps', UserManager.checkAuthority(['admin'], true), function(req, res){
        MMXManager.getApps(req.params.magnetId, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.put('/rest/users/:magnetId/activated', UserManager.checkAuthority(['admin'], true), function(req, res){
        UserManager.setActivation(req.params.magnetId, req.body.activated, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                winston.info('Accounts: user "'+req.session.user.firstName+' '+req.session.user.lastName+'"('+req.session.user.id+') changed activation state of user "'+(user.firstName ? user.firstName+' '+user.lastName : user.email)+'"('+user.id+') to activated:'+req.body.activated+' successfully at: '+new Date(), {
                    userId      : req.session.user.id,
                    targetModel : 'User',
                    targetId    : user.id
                });
                res.send('ok', 200);
            }
        });
    });

    app.get('/rest/views', UserManager.checkAuthority(['admin'], true), function(req, res){
        ContentManagement.getPageList(function(e, results){
            if(e){
                res.send(e, 400);
            }else{
                res.send(results, 200);
            }
        });
    });

    app.post('/rest/getView', UserManager.checkAuthority(['admin'], true), function(req, res){
        ContentManagement.viewPageContent(req, function(e, page){
            if(e){
                res.send(e, 400);
            }else{
                res.send(page, 200);
            }
        });
    });

    app.post('/rest/updateView', UserManager.checkAuthority(['admin'], true), function(req, res){
        ContentManagement.updateSinglePage(req, function(e, page){
            if(e){
                res.send(e, 400);
            }else{
                res.send(page, 200);
            }
        });
    });

    // This API is used to resend a Complete Registration Email
    app.post('/rest/users/:magnetId/sendCompleteRegistrationEmail', UserManager.checkAuthority(['admin'], true), function(req, res){
        UserManager.validateAndSendCompleteRegistrationEmail(req.params.magnetId, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    // This API is used for Admin to User invites
    app.post('/rest/adminInviteUser', UserManager.checkAuthority(['admin'], true), function(req, res) {
        var isInvitedByAdmin = true;
        req.body.firstName = req.body.firstName || null;
        req.body.lastName = req.body.lastName || null;
        req.body.companyName = req.body.companyName || null;

        UserManager.registerGuest({
            firstName : req.body.firstName ? stripChars(req.body.firstName) : req.body.firstName,
            lastName : req.body.lastName ? stripChars(req.body.lastName) : req.body.lastName,
            email : req.body.email,
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            inviterId: req.session.user.id,
            invitedEmail: req.body.email
        }, isInvitedByAdmin, function(registrationStatus, user) {
            if(registrationStatus == UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL) {
                UserManager.approveUser({
                    magnetId  : user.magnetId,
                    invitedBy : req.session.user
                }, isInvitedByAdmin, function(approvalStatus) {
                    if(approvalStatus == UserManager.ApproveUserStatusEnum.APPROVAL_SUCCESSFUL) {
                        res.send(approvalStatus, 201);
                    } else {
                        res.send(approvalStatus, 400);
                    }
                });
            } else {
                res.send(registrationStatus, 400);
            }
        });
    });

    // This API is used for User to User invites
    app.post('/rest/userInviteUser', UserManager.checkAuthority(['developer', 'admin'], true), function(req, res) {
        req.body.firstName = req.body.firstName || null;
        req.body.lastName = req.body.lastName || null;
        req.body.companyName = req.body.companyName || null;

        UserManager.inviteUser({
            firstName   : req.body.firstName ? stripChars(req.body.firstName) : req.body.firstName,
            lastName    : req.body.lastName ? stripChars(req.body.lastName) : req.body.lastName,
            email       : req.body.email,
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            inviterId   : req.session.user.id
        }, req.session.user.firstName, req.session.user.lastName, req.body.inviteMessage, function(registrationStatus) {
            if(registrationStatus == UserManager.InviteUserStatusEnum.INVITATION_SUCCESSFUL) {
                res.send(registrationStatus, 201);
            } else {
                res.send(registrationStatus, 400);
            }
        });
    });

    // This API is used for forgot password email
    app.post('/rest/forgotPassword', function(req, res) {

        UserManager.sendForgotPasswordEmail({
            email  : req.body.email,
            source : sanitize(req.body.source).xss()
        }, function(status) {
            if(status == UserManager.SendForgotPasswordEmailEnum.EMAIL_SUCCESSFUL) {
                res.send(status, 200);
            } else {
                res.send(status, 400);
            }
        });
    });

    // This API is used for resetting a forgotten password
    app.post('/rest/resetPassword', function(req, res) {

        UserManager.resetPassword({
            password : req.body.password,
            passwordResetToken: req.body.passwordResetToken
        }, function(status, user) {
            if(status == UserManager.ResetPasswordEnum.RESET_SUCCESSFUL) {
                res.send(status, 200);
            } else {
                res.send(status, 400);
            }
        });
    });

    // return server statistics
    app.get('/rest/stats', UserManager.checkAuthority(['admin'], true, null, true), function(req, res){
        res.send({
            'Hostname'        : require('os').hostname(),
            'Node Version'    : process.version,
            'Environment'     : app.settings.env,
            'Factory Version' : packageJSON.version,
            'Memory Usage'    : process.memoryUsage()
        });
    });
};

function stripChars(str){
    return str ? str.replace(/[^A-Za-z-_@£€ßçÇáàâäæãåèéêëîïíìôöòóøõûüùúÿñÁÀÂÄÆÃÅÈÉÊËÎÏÍÌÔÖÒÓØÕÛÜÙÚŸÑðÐ]/g, '') : null;
}
