var AccountManager = require('../lib/AccountManager')
, UserManager = require('../lib/UserManager')
, ProjectManager = require('../lib/ProjectManager')
, Queries = require('../lib/Queries')
, EmailService = require('../lib/EmailService')
, magnetId = require('node-uuid')
, path = require('path')
, fs = require('fs')
, _ = require('underscore')
, sanitize = require('validator').sanitize;

module.exports = function(app){

    /* AUTHENTICATION */

    // user log in and store to session and cookie
    app.post('/login', function(req, res){
        AccountManager.manualLogin(req.param('username'), req.param('password'), function(e, user){
            // if login returns a user object, store to session
            if(!user){
                res.redirect('/login?status=invalid');
            }else{
                delete user.password;
                req.session.user = user;
                console.log('Tracking: user "' + user.email + '" logged in', req.session.entryPoint);
                res.redirect(req.session.entryPoint || '/');
            }
        });
    });

    // logout user by destroying session and clearing cookies
    app.all('/logout', function(req, res){
        if(!req.session.user){
            res.redirect('/login');
        }else{
            console.log('Tracking: user "' + req.session.user.username + '" logged out');
            req.session.destroy(function(){
                res.redirect('/');
            });
        }
    });

    /* catch database models */
    var dbModels = ['users', 'projects'];
    app.get('/rest/:model', function(req, res, next){
        if(req.session.user && req.session.user.userType == 'admin' && _.contains(dbModels, req.params.model)){
            Queries.findAll(req, function(col){
                res.send(col, 200);
            });
        }else{
            next();
        }
    });

    app.get('/rest/:model/:id', function(req, res, next){
        if(req.session.user && req.session.user.userType == 'admin' && _.contains(dbModels, req.params.model)){
            Queries.find(req, function(model){
                res.send(model, 200);
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
        UserManager.update(req.session.user, {
            firstName   : stripChars(req.body.firstName),
            lastName    : stripChars(req.body.lastName),
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            oldpass     : req.body.oldpassword,
            newpass     : req.body.newpassword
        }, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                req.session.user = user;
                res.send('ok', 200);
            }
        });
    });

    app.get('/rest/projects/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.read(req, function(e, project){
            if(e){
                res.send(e, 400);
            }else{
                res.send(project, 200);
            }
        });
    });

    app.post('/rest/projects', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.create(req.session.user.magnetId, req.body, function(e, magnetId){
            if(e){
                res.send(e, 400);
            }else{
                res.send(magnetId, 200);
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
                    'Content-Type': 'text/plain'
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

    app.get('/rest/projects/:magnetId/wsdls', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.getWSDLs(req.params.magnetId, function(e, wsdls){
            if(e){
                res.send(e, 400);
            }else{
                res.send(wsdls, 200);
            }
        });
    });

    app.post('/rest/projects/:magnetId/addWSDLUrl', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.addWSDLUrl(req.params.magnetId, req.session.user.id, req.body.url, function(e, wsdl){
            if(e){
                res.send(e, 400);
            }else{
                res.send(wsdl, 200);
            }
        });
    });

    app.delete('/rest/wsdls/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.removeWSDLUrl(req.params.magnetId, function(e){
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
            to      : EmailService.EmailSettings.supportEmail,
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
                console.log('Tracking: user "' + req.session.user.email + '" sent an email from the Contact Us form');
                res.send('ok', 200);
            },
            error : function(e){
                res.send(e, 400);
            }
        });
    });

    app.post('/rest/getCredentials', function(req, res){
        AccountManager.manualLogin(req.param('email'), req.param('password'), function(e, user){
            // if login returns a user object, store to session
            if (!user) {
                res.send(e, 401);
            } else {
                var aws = {};
                user.getCloudAccounts().success(function(cloudAccounts) {
                    if (cloudAccounts.length) {
                        var aws = cloudAccounts[0];
                        res.json({
                            email: user.email,
                            key: user.magnetId,
                            signedKey: user.signedLicenseKey,
                            aws: {
                                bucketName: ENV_CONFIG.Cloud.AWS.BucketName,
                                folderName: aws.bucketName,
                                accessKeyId: aws.accessKeyId,
                                secretAccessKey: aws.secretAccessKey
                            }
                        });
                    } else {
                        res.send('missing-cloud-keys', 500);
                    }
                });
            }
        });
    });

    // This API is used by http://www.magnet.com/factory/
    /*
     {
     "firstName" : "Pritesh",
     "lastName" : "Shah",
     "email" : "pritesh.shah@magnet.com",
     "companyName" : "Magnet Systems, Inc."
     }
     */
    app.post('/rest/startRegistration', function(req, res) {
        UserManager.registerGuest({
            firstName : stripChars(req.body.firstName),
            lastName : stripChars(req.body.lastName),
            email : req.body.email,
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName
        }, false, function(registrationStatus) {
            if(registrationStatus == UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL) {
                res.send(registrationStatus, 201);
            } else {
                res.send(registrationStatus, 400);
            }
        });
    });

    app.put('/rest/users/:magnetId/approve', UserManager.checkAuthority(['admin'], true), function(req, res) {
        UserManager.approveUser({
            magnetId: req.param('magnetId')
        }, false, function(approvalStatus) {
            if(approvalStatus == UserManager.ApproveUserStatusEnum.APPROVAL_SUCCESSFUL) {
                res.send(approvalStatus, 200);
            } else {
                res.send(approvalStatus, 400);
            }
        });
    });

    app.post('/rest/users/:magnetId/completeRegistration', function(req, res) {
        UserManager.becomeDeveloper({
            magnetId : req.param('magnetId'),
            password : req.body.password,
            firstName : stripChars(req.body.firstName),
            lastName : stripChars(req.body.lastName),
            roleWithinCompany : sanitize(req.body.roleWithinCompany).xss(),
            country : sanitize(req.body.country).xss(),
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName
        }, function(approvalStatus) {
            if(approvalStatus == UserManager.BecomeDeveloperStatusEnum.SUCCESSFUL) {
                res.send(approvalStatus, 200);
            } else {
                res.send(approvalStatus, 400);
            }
        });
    });

    app.get('/rest/users/:magnetId', function(req, res){
        UserManager.read(req.params.magnetId, (typeof req.session.user == 'undefined'), function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.delete('/rest/users/:magnetId', UserManager.checkAuthority(['admin'], true), function(req, res){
        UserManager.delete(req.params.magnetId, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    // This API is used for Admin to User invites
    /*
     {
     "email" : "pritesh.shah@magnet.com"
     }
     */
    app.post('/rest/adminInviteUser', UserManager.checkAuthority(['admin'], true), function(req, res) {
        var isInvitedByAdmin = true;
        req.body.firstName = req.body.firstName || null;
        req.body.lastName = req.body.lastName || null;
        req.body.companyName = req.body.companyName || null;

        UserManager.registerGuest({
            firstName : stripChars(req.body.firstName),
            lastName : stripChars(req.body.lastName),
            email : req.body.email,
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            inviterId: req.session.user.id,
            invitedEmail: req.body.email
        }, isInvitedByAdmin, function(registrationStatus, user) {
            if(registrationStatus == UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL) {
                UserManager.approveUser({
                    magnetId: user.magnetId
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
    /*
     {
     "email" : "pritesh.shah@magnet.com",
     "introduceMsg" : "I found this great new tool to quickly create mobile apps for me."
     }
     */
    app.post('/rest/userInviteUser', UserManager.checkAuthority(['developer', 'admin'], true), function(req, res) {
        req.body.firstName = req.body.firstName || null;
        req.body.lastName = req.body.lastName || null;
        req.body.companyName = req.body.companyName || null;

        UserManager.inviteUser({
            firstName : stripChars(req.body.firstName),
            lastName : stripChars(req.body.lastName),
            email : req.body.email,
            companyName : req.body.companyName ? sanitize(req.body.companyName).xss() : req.body.companyName,
            inviterId: req.session.user.id
        }, req.session.user.firstName, req.session.user.lastName, req.body.inviteMessage, function(registrationStatus) {
            if(registrationStatus == UserManager.InviteUserStatusEnum.INVITATION_SUCCESSFUL) {
                res.send(registrationStatus, 201);
            } else {
                res.send(registrationStatus, 400);
            }
        });
    });

    // This API is used for forgot password email
    /*
     {
     "email" : "pritesh.shah@magnet.com"
     }
     */
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
    /*
     {
     "password" : "test",
     "passwordResetToken" : "b00184d0-2adf-11e3-bdae-e739654ae233"
     }
     */
    app.post('/rest/resetPassword', function(req, res) {

        UserManager.resetPassword({
            password : req.body.password,
            passwordResetToken: req.body.passwordResetToken
        }, function(status) {
            if(status == UserManager.ResetPasswordEnum.RESET_SUCCESSFUL) {
                res.send(status, 200);
            } else {
                res.send(status, 400);
            }
        });
    });
};

function stripChars(str){
    return str ? str.replace(/[^A-Za-z-_@£€ßçÇáàâäæãåèéêëîïíìôöòóøõûüùúÿñÁÀÂÄÆÃÅÈÉÊËÎÏÍÌÔÖÒÓØÕÛÜÙÚŸÑðÐ]/g, '') : null;
}
