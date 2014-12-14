var UserManager = require('../lib/UserManager')
, Jobs = require('../lib/Jobs')
, Countries = require('../lib/config/CountryList')
, ejs = require('ejs')
, fs = require('fs');

module.exports = function(app){

/* PAGES */

    var siteHeader = ejs.render(fs.readFileSync('./views/layouts/header.ejs', 'ascii'), {});

    app.get('/', function(req, res){
        res.render('index', {
            locals : {
                title           : 'Home',
                activePage      : 'home',
                latestNews      : Jobs.get('Announcements'),
                sessionUser     : req.session.user,
                homePageVideoID : APP_CONFIG.homePageVideoID,
                page            : 'developer'
            }
        });
    });

    app.get('/resources', function(req, res){
        res.render('resources/index', {
            locals : {
                title       : 'Resources',
                activePage  : 'resources',
                sessionUser : req.session.user
            }
        });
    });

    app.get('/get-started', function(req, res){
        res.render('getstarted/index', {
            locals : {
                title        : 'Get Started',
                activePage   : 'get-started',
                sessionUser  : req.session.user
            }
        });
    });

    app.get('/support', function(req, res){
        res.render('support/index', {
            locals : {
                title        : 'Support',
                activePage   : 'support',
                sessionUser  : req.session.user,
                captcha      : ENV_CONFIG.reCAPTCHA.enabled
            }
        });
    });

    app.get('/docs', function(req, res){
        res.render('docs/index', {
            locals : {
                title       : 'Documentation',
                activePage  : 'docs',
                sessionUser : req.session.user
            }
        });
    });

    app.get('/docs/search', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('docs/search', {
            locals : {
                title       : 'Documentation Search',
                activePage  : 'docs',
                sessionUser : req.session.user
            },
            layout : '../views/layouts/site'
        });
    });

    app.get('/docs/oss-mobile-app-builder', function(req, res){
        res.render('file-templates/doc-template', {
            locals : {
                title       : 'Mobile App Builder Open Source',
                activePage  : 'docs',
                metadata    : require('../views/file-templates/oss_mobile_app_builder.json'),
                sessionUser : req.session.user
            }
        });
    });

    app.get('/docs/oss-mobile-backend', function(req, res){
        res.render('file-templates/doc-template', {
            locals : {
                title       : 'Mobile Backend Open Source',
                activePage  : 'docs',
                metadata    : require('../views/file-templates/oss_mobile_backend.json'),
                sessionUser : req.session.user
            }
        });
    });

    app.get('/archives', function(req, res){
        res.render('archives/v230', {
            locals : {
                title        : 'Archive for version 2.3',
                activePage   : 'archives',
                sessionUser  : req.session.user
            }
        });
    });

    app.get('/archives/2.3', function(req, res){
        res.render('archives/v230', {
            locals : {
                title        : 'Archive for version 2.3',
                activePage   : 'archives',
                sessionUser  : req.session.user
            }
        });
    });

    app.get('/archives/2.3/get-started', function(req, res){
        res.render('archives/v230-getstarted', {
            locals : {
                title        : 'Archive for version 2.3',
                activePage   : 'archives',
                sessionUser  : req.session.user
            }
        });
    });

    app.get('/archives/2.3/build-backend', function(req, res){
        res.render('archives/v230-buildbackend', {
            locals : {
                title        : 'Archive for version 2.3',
                activePage   : 'archives',
                sessionUser  : req.session.user
            }
        });
    });

    app.get('/archives/2.3/build-mobile', function(req, res){
        res.render('archives/v230-buildmobile', {
            locals : {
                title        : 'Archive for version 2.3',
                activePage   : 'archives',
                sessionUser  : req.session.user
            }
        });
    });

    app.get('/rest2mobile', function(req, res){
        res.render('rest2mobile/index', {
            locals : {
                title       : 'rest2mobile',
                activePage  : 'rest2mobile',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/rest2mobile/cli', function(req, res){
        res.render('rest2mobile/cli', {
            locals : {
                title       : 'rest2mobile - Command Line Tool',
                activePage  : 'rest2mobile',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/rest2mobile/android', function(req, res){
        res.render('rest2mobile/android', {
            locals : {
                title       : 'rest2mobile - Android Plugin',
                activePage  : 'rest2mobile',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/rest2mobile/ios', function(req, res){
        res.render('rest2mobile/ios', {
            locals : {
                title       : 'rest2mobile - XCode Plugin',
                activePage  : 'rest2mobile',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/messaging', function(req, res){
        res.render('messaging/index', {
            locals : {
                title       : 'Mobile Messaging',
                activePage  : 'messaging',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/messaging/android', function(req, res){
        res.render('messaging/android', {
            locals : {
                title       : 'Mobile Messaging - Android',
                activePage  : 'messaging',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/messaging/ios', function(req, res){
        res.render('messaging/ios', {
            locals : {
                title       : 'Mobile Messaging - iOS',
                activePage  : 'messaging',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/persistence', function(req, res){
        res.render('persistence/index', {
            locals : {
                title       : 'Mobile Persistence',
                activePage  : 'messaging',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/persistence/android', function(req, res){
        res.render('persistence/android', {
            locals : {
                title       : 'Mobile Persistence - Android',
                activePage  : 'messaging',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/persistence/ios', function(req, res){
        res.render('persistence/ios', {
            locals : {
                title       : 'Mobile Persistence - iOS',
                activePage  : 'messaging',
                sessionUser : req.session.user,
                page        : 'developer'
            }
        });
    });

    app.get('/profile', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('profile/index', {
            locals : {
                title       : 'My Profile',
                activePage  : 'profile',
                sessionUser : req.session.user
            }
        });
    });

    app.get('/account/registration', function(req, res){
        res.render('registration/registration', {
            locals : {
                title       : 'Registration',
                activePage  : 'account',
                sessionUser : req.session.user
            }
        });
    });

    app.get('/account/confirm-registration', function(req, res){
        res.render('registration/confirm-registration', {
            locals : {
                title       : 'Confirm Registration',
                activePage  : 'account',
                countries   : Countries,
                sessionUser : req.session.user
            }
        });
    });

    app.get('/account/complete-registration', function(req, res){
        res.render('registration/complete-registration', {
            locals : {
                title       : 'Complete Registration',
                activePage  : 'account',
                countries   : Countries,
                sessionUser : req.session.user
            }
        });
    });

    app.get('/account/forgot-password', function(req, res){
        res.render('registration/forgot-password', {
            locals : {
                title       : 'Forgot Password',
                activePage  : 'account',
                sessionUser : req.session.user
            }
        });
    });

    app.get('/account/reset-password', function(req, res){
        res.render('registration/reset-password', {
            locals : {
                title       : 'Reset Password',
                activePage  : 'account',
                sessionUser : req.session.user
            }
        });
    });

    app.get('/admin', UserManager.checkAuthority(['admin']), function(req, res){
        res.render('admin/index', {
            locals : {
                title       : 'Administration',
                activePage  : 'admin',
                sessionUser : req.session.user,
                header      :  siteHeader
            },
            layout : '../views/layouts/site'
        });
    });

    app.get('/login', function(req, res){
        Login(res);
    });

/* GENERAL */
	
    // render login
    function Login(res){
        res.render('login', { 
            locals : { 
                title       : 'Login',
                bodyType    : 'dev',
                activePage  : '',
                userEmail   : '',
                userCompany : '',
                countries   : Countries,
                captcha     : ENV_CONFIG.reCAPTCHA.enabled
            }
        });
    }
    
    // render 404
    function do404(req, res){
        res.status(404);
        res.render('error/404', {
            locals : {
                title       : 'Page Not Found',
                bodyType    : 'dev',
                activePage  : '404',
                sessionUser : req.session.user
            }
        });
    }
    
    // handle unknown requests
	app.get('*', function(req, res){ 
        do404(req, res);
    });

};