var CountryList = require('../lib/config/CountryList')
, AccountManager = require('../lib/AccountManager')
, UserManager = require('../lib/UserManager')
, ProjectManager = require('../lib/ProjectManager')
, EmailService = require('../lib/EmailService')
, magnetId = require('node-uuid')
, path = require('path')
, fs = require('fs')
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
                req.session.user = {
                    firstName : user.firstName,
                    lastName  : user.lastName,
                    company   : user.company,
                    userName  : user.userName,
                    email     : user.email,
                    country   : user.country,
                    userType  : user.userType,
                    magnetId  : user.magnetId
                };
                console.log('Tracking: user "' + user.email + '" logged in');
                res.redirect('/');
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

    /* REGISTRATION */

    // register a new user
    app.post('/rest/startRegistrationOld', function(req, res){
        UserManager.create({
//            authority      : req.param('authority'),
            userName       : req.param('email'),
            email          : req.param('email'),
//            phoneNumber    : req.param('phoneNumber'),
            firstName      : req.param('firstName'),
            lastName       : req.param('lastName'),
//            companyName    : req.param('companyName'),
//            title          : req.param('title'),
            password       : req.param('password')
//            invitor        : req.param('invitor'),
//            allowMarketing : req.param('marketing'),
//            inviteMessage  : req.param('inviteMessage')
        }, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 201);
            }
        });
    });

    /* USER */

    app.get('/rest/profile', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        UserManager.read(req.session.user, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.put('/rest/profile', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        UserManager.update(req.session.user, {
            firstName : req.body.firstName,
            lastName  : req.body.lastName,
            company   : req.body.company,
            oldpass   : req.body.oldpassword,
            newpass   : req.body.newpassword
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
        ProjectManager.create(req, function(e, magnetId){
            if(e){
                res.send(e, 400);
            }else{
                res.send(magnetId, 200);
            }
        });
    });

    app.put('/rest/projects/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.update(req, function(e, project){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    app.get('/rest/projects/:magnetId/getConfig', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        ProjectManager.getConfig(req, function(e, filePath){
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
        ProjectManager.storeProjectFile(req, function(e){
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
        ProjectManager.removeAPNSCertificate(req, function(e){
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

    /* PASSWORD RESET */

    // send password reset email
    app.post('/lost-password', function(req, res){
        // look up the user account via email
        UserManager.getByEmail(req.param('email'), function(e, user){
            if(user){
                res.send('ok', 200);
                // build email body and send out email
                EmailService.sendPasswordResetEmail(user, host, function(e, msg){
                    if(msg){
                        res.send('ok', 200);
                    }else{
                        res.send(e, 400);
                    }
                });
            }else{
                res.send(e, 403);
            }
        });
    });

    // verify reset password API credentials
    app.get('/reset-password', function(req, res){
        // search for a user by email and password
        UserManager.getBy({
            email    : req.query['e'],
            password : req.query['p']
        }, function(e, user){
            if(user){
                // store email and hashed password to session variable
                req.session.reset = {
                    email    : user.email,
                    password : user.password
                };
                res.render('reset-password', {
                    title : 'Reset Password',
                    layout : 'layouts/site'
                });
            }else{
                res.redirect('/');
            }
        })
    });

    // reset password
    app.post('/reset-password', function(req, res){
        // retrieve the user's email from the session
        var email = req.session.reset.email;
        // destroy session
        req.session.destroy();
        UserManager.setPassword(email, req.param('pass'), function(e, user){
            if(user){
                res.send('ok', 200);
            }else{
                res.send(e, 403);
            }
        })
    });

    app.post('/rest/getCredentials', function(req, res){
        AccountManager.manualLogin(req.param('email'), req.param('password'), function(e, user){
            // if login returns a user object, store to session
            if (!user) {
                res.send(e, 401);
            } else {
                var aws = {};
                user.getCloudAccounts().success(function(cloudAccounts) {
                    var aws = cloudAccounts[0];
                    if (cloudAccounts.length) {
                        res.json({
                            email: user.email,
                            aws: {
                                bucketName: aws.bucketName,
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
    app.post('/rest/users/startRegistration', function(req, res) {
        UserManager.registerGuest({
            firstName : req.body.firstName,
            lastName : req.body.lastName,
            email : req.body.email,
            companyName : req.body.companyName
        }, function(registrationStatus) {
            if(registrationStatus == UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL) {
                res.send(registrationStatus, 201);
            } else {
                res.send(registrationStatus, 400);
            }
        });
    });

    app.put('/rest/users/:magnetId/approve', /*UserManager.checkAuthority(['admin'], true), */function(req, res) {
        UserManager.approveUser({
            magnetId: req.param('magnetId')
        }, function(approvalStatus) {
            if(approvalStatus == UserManager.ApproveUserStatusEnum.APPROVAL_SUCCESSFUL) {
                res.send(approvalStatus, 200);
            } else {
                res.send(approvalStatus, 400);
            }
        });
    });

    app.put('/rest/users/:magnetId/completeRegistration', function(req, res) {
        console.log(req);
    });

};