var UserManager = require('../lib/UserManager')
, Jobs = require('../lib/Jobs')
, Countries = require('../lib/config/CountryList')
, ejs = require('ejs')
, fs = require('fs');

module.exports = function(app){

/* PAGES */

    app.get('/', function(req, res){
        res.render('index', {
            locals : {
                title           : 'Home',
                activePage      : 'home',
                latestNews      : Jobs.get('Announcements'),
                sessionUser     : req.session.user,
                homePageVideoID : APP_CONFIG.homePageVideoID
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

    app.get('/get-started', function(req, res){
        res.render('getstarted/index', {
            locals : {
                title        : 'Get Started',
                activePage   : 'get-started',
                sessionUser  : req.session.user
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

    app.get('/profile', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('profile/index', {
            locals : {
                title       : 'My Profile',
                activePage  : 'profile',
                sessionUser : req.session.user
            }
        });
    });

    app.get('/admin', UserManager.checkAuthority(['admin']), function(req, res){
        res.render('admin/index', {
            locals : {
                title       : 'Administration',
                sessionUser : req.session.user
            },
            _layoutFile : false
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