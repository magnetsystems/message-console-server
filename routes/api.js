var AccountManager = require('../lib/AccountManager')
, UserManager = require('../lib/UserManager')
, ProjectManager = require('../lib/ProjectManager')
, ModelManager = require('../lib/ModelManager')
, EmailService = require('../lib/EmailService')
, TokenManager = require('../lib/TokenManager')
, AppConfigManager = require('../lib/ConfigManager')
, FullTextSearch = require('../lib/FullTextSearch')
, magnetId = require('node-uuid')
, Jobs = require('../lib/Jobs')
, path = require('path')
, fs = require('fs')
, jiraNewIssue = require('../lib/config/JiraNewIssue')
, _ = require('underscore')
, validator = require('validator')
, sanitize = validator.sanitize
, JiraApi = require('jira').JiraApi
, recaptcha = require('simple-recaptcha')
, ContentManagement = require('../lib/ContentManagement')
, packageJSON = require('../package.json');

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
                res.redirect((req.session.entryPoint && req.session.entryPoint.indexOf('login') == -1) ? req.session.entryPoint : '/');
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
                delete user.password;
                req.session.user = user;
                winston.verbose('Tracking: user "' + user.email + '" logged in'+ (req.session.entryPoint));
                res.send(req.query.requireUser ? req.session.user.magnetId : 'SUCCESS', 200);
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
                res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                res.redirect('back');
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
            }
        });
    });
//
//    app.get('/rest/projects/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.read(req.params.magnetId, function(e, project){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send(project, 200);
//            }
//        });
//    });
//
//    app.post('/rest/projects', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.create(req.session.user.magnetId, req.body, function(e, project){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send({
//                    id       : project.id,
//                    magnetId : project.magnetId
//                }, 200);
//            }
//        });
//    });
//
//    app.put('/rest/projects/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.update(req.params.magnetId, req.session.user.id, req.body, function(e, project){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send('ok', 200);
//            }
//        });
//    });
//
//    app.get('/rest/projects/:magnetId/getConfig', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.getConfig(req.params.magnetId, function(e, filePath){
//            if(e){
//                res.send(e, 400);
//            }else{
//                var filename = filePath.slice(filePath.lastIndexOf('/')+1);
//                fs.readFile(filePath, function(e, content){
//                    if(e){
//                        res.writeHead(400);
//                        res.end();
//                    }else{
//                        res.contentType('zip');
//                        res.setHeader('Content-disposition', 'attachment; filename='+filename);
//                        res.end(content, 'utf-8');
//                    }
//                });
//            }
//        });
//    });
//
//    app.post('/rest/projects/:magnetId/uploadAPNSCertificate', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.storeProjectFile(req.params.magnetId, req, function(e){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send(JSON.stringify({
//                    success : true
//                }), {
//                    'Content-Type' : 'text/plain'
//                }, 200);
//            }
//        });
//    });
//
//    app.post('/rest/projects/:magnetId/removeAPNSCertificate', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.removeAPNSCertificate(req.params.magnetId, function(e){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send('ok', 200);
//            }
//        });
//    });
//
//    app.get('/rest/projects/:magnetId/webservices', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.getWebServices(req.params.magnetId, function(e, wsdls){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send(wsdls, 200);
//            }
//        });
//    });
//
//    app.post('/rest/projects/:magnetId/addWebServiceURL', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.addWebServiceURL(req.params.magnetId, req.session.user.id, req.body.url, function(e, wsdl){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send(wsdl, 200);
//            }
//        });
//    });
//
//    app.delete('/rest/wsdls/:magnetId', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        ProjectManager.removeWebServiceURL(req.params.magnetId, function(e){
//            if(e){
//                res.send(e, 400);
//            }else{
//                res.send('ok', 200);
//            }
//        });
//    });

    /* GENERAL */

//    app.post('/rest/contactUs', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
//        // build email body and send out email
//        EmailService.sendEmail({
//            to      : ENV_CONFIG.Email.supportEmail,
//            subject : 'Magnet Developer Factory Support',
//            html    : EmailService.renderTemplate({
//                main : 'support-email',
//                vars : {
//                    customerName  : req.session.user.firstName +' '+ req.session.user.lastName,
//                    customerEmail : req.session.user.email,
//                    reason        : sanitize(req.body.reason).xss(),
//                    message       : sanitize(req.body.message).xss()
//                }
//            }),
//            success : function(){
//                winston.verbose('Tracking: user "' + req.session.user.email + '" sent an email from the Contact Us form');
//                res.send('ok', 200);
//            },
//            error : function(e){
//                res.send(e, 400);
//            }
//        });
//    });

    app.post('/rest/submitFeedback', function(req, res){
        if(isAuthenticated(req) === false && !req.body.fullname){
            res.send('required-field-missing', 400);
        }else if(isAuthenticated(req) === false && (!req.body.emailaddress || !validator.validators.isEmail(req.body.emailaddress))){
            res.send('invalid-email', 400);
        }else if(!req.body.sub || !req.body.msg){
            res.send('required-field-missing', 400);
        }else{
            if(isAuthenticated(req) === false && ENV_CONFIG.reCAPTCHA.enabled === true && !debugOverride(req.body.recaptcha_response_field))
                recaptcha(ENV_CONFIG.reCAPTCHA.privateKey, req.ip, req.body.recaptcha_challenge_field, req.body.recaptcha_response_field, function(e){
                    if(e){
                        res.send('captcha-failed', 400);
                    }else{
                        sendJira(req, res);
                    }
                });
            else{
                sendJira(req, res);
            }
        }
    });

    function isAuthenticated(req){
        return (req.session && req.session.user && req.session.user.activated === true && (req.session.user.userType == 'admin' || req.session.user.userType == 'developer')) || false;
    }

    function debugOverride(str){
        return str === 'captcha-override';
    }

    function sendJira(req, res){
        var jira = new JiraApi('https', ENV_CONFIG.Jira.host, ENV_CONFIG.Jira.port, ENV_CONFIG.Jira.user, ENV_CONFIG.Jira.password, ENV_CONFIG.Jira.version);
        jiraNewIssue.fields.summary = sanitize(req.body.sub).xss();
        jiraNewIssue.fields.labels = ['MCI', req.body.type == 'Comment' ? 'COMMENT' : 'QUESTION', ENV_CONFIG.Email.appUrl];
        jiraNewIssue.fields.description = sanitize(req.body.msg).xss();
        jiraNewIssue.fields.issuetype = {
            id : req.body.type == 'Comment' ? '4' : '2'
        };
        jiraNewIssue.fields['customfield_10950'] = isAuthenticated(req) === false ? req.body.fullname : req.session.user.firstName +' '+ req.session.user.lastName;
        jiraNewIssue.fields['customfield_10951'] = isAuthenticated(req) === false ? req.body.emailaddress : req.session.user.email;
        jiraNewIssue.fields['customfield_10751'] = isAuthenticated(req) === false ? 'unregistered-user' : ENV_CONFIG.Email.appUrl+'/admin#/users/'+req.session.user.magnetId;
        var utc = new Date().toISOString();
        jiraNewIssue.fields['customfield_10752'] = utc.slice(0, utc.lastIndexOf('.'))+'.730-0700';
        jira.addNewIssue(jiraNewIssue, function(e, issue){
            if(e){
                winston.error('Tracking: feedback submission failed: ', e, jiraNewIssue);
                res.send('error', 400);
            }else{
                winston.verbose('Tracking: user "' + (req.body.fullname || req.session.user.email) + '" submitted feedback.');
                res.send('ok', 200);
            }
        });
    }

    app.post('/rest/getCredentials', function(req, res){
        var clientVersion = req.headers['x_client_version'];
        AccountManager.manualLogin(req.param('email'), req.param('password'), function(e, user){
            if (!user) {
                res.send(e, 401);
            } else {
                TokenManager.getTokens(user, function(e, tokens){
                    if(typeof tokens != 'undefined' && tokens.length){
                        var json = {
                            email   : user.email,
                            license : {
                                customerId : user.magnetId,
                                licenseKey : user.signedLicenseKey
                            }
                        }
                        if(typeof clientVersion == 'undefined'){
                            json.aws = {
                                auditBucket : ENV_CONFIG.Cloud.AWS.BucketName,
                                accessKey   : tokens[0].accessKeyId,
                                secretKey   : tokens[0].secretAccessKey
                            };
                        }else{
                            json.auditBucket = ENV_CONFIG.Cloud.AWS.BucketName;
                            json.tokens = tokens;
                        }
                        res.json(json);
                    }else{
                        res.send('missing-cloud-keys', 500);
                    }
                });
            }
        });
    });

    // get list of tokens belonging to the current user
    app.get('/rest/tokens', UserManager.checkAuthority(['admin', 'developer'], true, null, true), function(req, res){
        TokenManager.getTokens(req.session.user, function(e, tokens){
            if(e){
                res.send(e, 400);
            }else{
                res.send(tokens, 200);
            }
        });
    });

    // revoke a Magnet token
    app.post('/rest/tokens/:magnetId/revoke', UserManager.checkAuthority(['admin', 'developer'], true, null, true), function(req, res){
        TokenManager.revoke(req._basicAuthUser || req.session.user, req.param('magnetId'), function(e){
            if(e)
                res.send(e, 400);
            else
                res.send('ok', 200);
        });
    });

    // regnerate a Magnet token
    app.post('/rest/tokens/:magnetId/regenerate', UserManager.checkAuthority(['admin', 'developer'], true, null, true), function(req, res){
        TokenManager.allocate(req._basicAuthUser || req.session.user, req.param('magnetId'), function(e, newToken){
            if(e){
                res.send(e, 400);
            }else{
                res.send(newToken, 200);
            }
        });
    });

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

    // This API is used to retrieve the latest news
    app.get('/rest/news', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        res.send(Jobs.get('Announcements'), 200);
    });

    // This API is used to retrieve the latest news
    app.get('/rest/news/getInfo', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        res.send({
            updatedAt  : Jobs.cache['Announcements'].updatedAt,
            nextUpdate : Jobs.cache['Announcements'].nextUpdate
        }, 200);
    });

    // This API is used to update the news
    app.post('/rest/news/updateCache', UserManager.checkAuthority(['admin'], true), function(req, res){
        Jobs.refresh('Announcements', function(cache){
            res.send({
                updatedAt  : cache.updatedAt,
                nextUpdate : cache.nextUpdate
            }, 200);
        })
    });

    // This API is used to clear search indexes
    app.post('/rest/search/clearIndexes', UserManager.checkAuthority(['admin'], true, null, true), function(req, res){
        FullTextSearch.clear(function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    // This API is used to update search indexes
    app.post('/rest/search/updateIndexes', UserManager.checkAuthority(['admin'], true, null, true), function(req, res){
        FullTextSearch.index(function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    // This API is used to search
    app.get('/rest/search', UserManager.checkAuthority(['admin', 'developer'], true), function(req, res){
        FullTextSearch.search(req.query.query, req.query.from, 10, function(e, results){
            if(e){
                res.send(e, 400);
            }else{
                res.send(results, 200);
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
