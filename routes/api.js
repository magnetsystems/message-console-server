var AccountManager = require('../lib/AccountManager')
, UserManager = require('../lib/UserManager')
, JumpStartUserManager = require('../lib/JumpStartUserManager')
, ProjectManager = require('../lib/ProjectManager')
, ModelManager = require('../lib/ModelManager')
, EmailService = require('../lib/EmailService')
, AppConfigManager = require('../lib/ConfigManager')
, magnetId = require('node-uuid')
, path = require('path')
, fs = require('fs')
, _ = require('underscore')
, sanitize = require('validator').sanitize;

module.exports = function(app){

    /* AUTHENTICATION */

    // user log in and store to session and cookie
    app.post('/login', function(req, res){
        AccountManager.manualLogin(req.body.username, req.body.password, function(e, user){
            // if login returns a user object, store to session
            if(user){
                delete user.password;
                req.session.user = user;
                winston.verbose('Tracking: user "' + user.email + '" logged in'+ (req.session.entryPoint ? ' with redirect to '+req.session.entryPoint : ''));
                res.redirect(req.session.entryPoint || '/');
            }else if(e == 'account-locked'){
                res.redirect('/login?status=locked');
            }else{
                res.redirect('/login?status=invalid');
            }
        });
    });

    // artifactory login
    app.post('/rest/login', function(req, res){
        AccountManager.manualLogin(req.body.name, req.body.password, function(e, user){
            if(user){
                res.send('SUCCESS', 200);
            }else{
                res.send(e, 401);
            }
        });
    });

    // logout user by destroying session and clearing cookies
    app.all('/logout', function(req, res){
        if(!req.session.user){
            res.redirect('/login');
        }else{
            winston.verbose('Tracking: user "' + req.session.user.email + '" logged out');
            req.session.destroy(function(){
                res.redirect('/');
            });
        }
    });

    /* catch database models */
    var getDBModels = ['users', 'projects', 'events'];
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

    var putDBModels = ['users'];
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

    /* USER */

    app.get('/rest/profile', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        UserManager.read(req.session.user.magnetId, false, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
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
                // Populate JumpStart DB
                JumpStartUserManager.updateUser(user.email, newPassword, function(err) {
                    //
                });

            }
        });
    });

    app.get('/rest/projects/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.read(req.params.magnetId, function(e, project){
            if(e){
                res.send(e, 400);
            }else{
                res.send(project, 200);
            }
        });
    });

    app.post('/rest/projects', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.create(req.session.user.magnetId, req.body, function(e, project){
            if(e){
                res.send(e, 400);
            }else{
                res.send({
                    id       : project.id,
                    magnetId : project.magnetId
                }, 200);
            }
        });
    });

    app.put('/rest/projects/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.update(req.params.magnetId, req.session.user.id, req.body, function(e, project){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    app.get('/rest/projects/:magnetId/getConfig', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.getConfig(req.params.magnetId, function(e, filePath){
            if(e){
                res.send(e, 400);
            }else{
                var filename = filePath.slice(filePath.lastIndexOf('/')+1);
                fs.readFile(filePath, function(e, content){
                    if(e){
                        res.writeHead(400);
                        res.end();
                    }else{
                        res.contentType('zip');
                        res.setHeader('Content-disposition', 'attachment; filename='+filename);
                        res.end(content, 'utf-8');
                    }
                });
            }
        });
    });

    app.post('/rest/projects/:magnetId/uploadAPNSCertificate', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.storeProjectFile(req.params.magnetId, req, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send(JSON.stringify({
                    success : true
                }), {
                    'Content-Type' : 'text/plain'
                }, 200);
            }
        });
    });

    app.post('/rest/projects/:magnetId/removeAPNSCertificate', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.removeAPNSCertificate(req.params.magnetId, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    app.get('/rest/projects/:magnetId/webservices', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.getWebServices(req.params.magnetId, function(e, wsdls){
            if(e){
                res.send(e, 400);
            }else{
                res.send(wsdls, 200);
            }
        });
    });

    app.post('/rest/projects/:magnetId/addWebServiceURL', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.addWebServiceURL(req.params.magnetId, req.session.user.id, req.body.url, function(e, wsdl){
            if(e){
                res.send(e, 400);
            }else{
                res.send(wsdl, 200);
            }
        });
    });

    app.delete('/rest/wsdls/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.removeWebServiceURL(req.params.magnetId, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    /* GENERAL */

    app.post('/rest/contactUs', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        // build email body and send out email
        EmailService.sendEmail({
            to      : ENV_CONFIG.Email.supportEmail,
            subject : 'Magnet Developer Factory Support',
            html    : EmailService.renderTemplate({
                main : 'support-email',
                vars : {
                    customerName  : req.session.user.firstName +' '+ req.session.user.lastName,
                    customerEmail : req.session.user.email,
                    reason        : sanitize(req.body.reason).xss(),
                    message       : sanitize(req.body.message).xss()
                }
            }),
            success : function(){
                winston.verbose('Tracking: user "' + req.session.user.email + '" sent an email from the Contact Us form');
                res.send('ok', 200);
            },
            error : function(e){
                res.send(e, 400);
            }
        });
    });

    app.post('/rest/getCredentials', function(req, res){
        AccountManager.manualLogin(req.param('email'), req.param('password'), function(e, user){
            if (!user) {
                res.send(e, 401);
            } else {
                var aws = {};
                user.getCloudAccounts().success(function(cloudAccounts) {
                    if (cloudAccounts.length) {
                        var aws = cloudAccounts[0];
                        res.json({
                            email: user.email,
                            license: {
                                customerId: user.magnetId,
                                licenseKey: user.signedLicenseKey
                            },
                            aws: {
                                auditBucket: ENV_CONFIG.Cloud.AWS.BucketName,
                                accessKey: aws.accessKeyId,
                                secretKey: aws.secretAccessKey
                            }
                        });
                    } else {
                        res.send('missing-cloud-keys', 500);
                    }
                });
            }
        });
    });

    app.post('/rest/startRegistration', function(req, res) {
        UserManager.registerGuest({
            firstName : stripChars(req.body.firstName),
            lastName : stripChars(req.body.lastName),
            email : req.body.email,
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            magnetId: req.body.magnetId
        }, false, function(registrationStatus) {
            if(registrationStatus == UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL) {
                res.send({
                    status            : registrationStatus,
                    skipAdminApproval : APP_CONFIG.skipAdminApproval
                }, 201);
            } else {
                res.send(registrationStatus, 400);
            }
        });
    });

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
                // Populate JumpStart DB
                JumpStartUserManager.createUser(user.email, password, function(err) {
                    //
                });
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
                    // Populate JumpStart DB
                    // The following call might fail if the user is not a developer, but thats ok
                    JumpStartUserManager.deleteUser(user.email, function(err) {
                        //
                    });
                }
                res.send('ok', 200);
            }
        });
    });

    app.get('/rest/users/:magnetId/cloudAccounts', UserManager.checkAuthority(['admin'], true), function(req, res){
        UserManager.getCloudAccounts(req.params.magnetId, function(e, cloudAccounts){
            if(e){
                res.send(e, 400);
            }else{
                res.send(cloudAccounts, 200);
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
                // Populate JumpStart DB
                JumpStartUserManager.setActivation(user.email, req.body.activated, function(err) {
                    //
                });
            }
        });
    });

    // This API is used to retrieve configuration
    app.get('/rest/configs', UserManager.checkAuthority(['admin'], true), function(req, res){
        res.send(APP_CONFIG, 200);
    });

    // This API is used to update configuration
    app.put('/rest/configs', UserManager.checkAuthority(['admin'], true), function(req, res){
        AppConfigManager.set(req.body, function(e, changes){
            if(e){
                res.send(e, 400);
            }else{
                winston.info('AppConfig: user "'+req.session.user.firstName+' '+req.session.user.lastName+'"('+req.session.user.id+') updated app configuration: '+JSON.stringify(changes)+' successfully at: '+new Date(), {
                    userId      : req.session.user.id,
                    targetModel : 'AppConfig',
                    targetId    : APP_CONFIG.id || 0
                });
                res.send('ok', 200);
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
            email : req.body.email
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
                // Populate JumpStart DB
                JumpStartUserManager.updateUser(user.email, req.body.password, function(err) {
                    //
                });
            } else {
                res.send(status, 400);
            }
        });
    });

    // return server statistics
    app.get('/rest/stats', UserManager.checkAuthority(['admin'], true), function(req, res){
        res.send({
            'Hostname'        : require('os').hostname(),
            'Node Version'    : process.version,
            'Factory Version' : require('../package.json').version,
            'Memory Usage'    : process.memoryUsage()
          });
//        res.send({
//            'Platform'          : process.platform,
//            'Architecture'      : process.arch,
//            'Process Title'     : process.title,
//            'PID'               : process.pid,
//            'Environment Vars'  : process.env,
//            'Hostname'          : require('os').hostname(),
//            'Node Version'      : process.version,
//            'Factory Version'   : require('./package.json').version,
//            'Module Versions'   : process.versions,
//            'Execution Path'    : process.execPath,
//            'Working Directory' : process.cwd(),
//            'Memory Usage'      : process.memoryUsage(),
//            'File Mask'         : process.umask().toString(8),
//            'Uptime'            : process.uptime() + ' seconds',
//            'POSIX UID'         : process.getuid(),
//            'POSIX GID'         : process.getgid(),
//            'POSIX Groups'      : process.getgroups()
//        });
    });
};

function stripChars(str){
    return str ? str.replace(/[^A-Za-z-_@£€ßçÇáàâäæãåèéêëîïíìôöòóøõûüùúÿñÁÀÂÄÆÃÅÈÉÊËÎÏÍÌÔÖÒÓØÕÛÜÙÚŸÑðÐ]/g, '') : null;
}
