var UserManager = require('../lib/UserManager')
, Jobs = require('../lib/Jobs')
, Countries = require('../lib/config/CountryList')
, ejs = require('ejs')
, fs = require('fs');

var registerPanel = ejs.render(fs.readFileSync('./views/file-templates/register-panel.ejs', 'ascii'));

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
                sessionUser  : req.session.user
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

    app.get('/learn-more', function(req, res){
        res.render('learnmore/index', {
            locals : {
                title         : 'Learn More',
                activePage    : 'learn-more',
                sessionUser   : req.session.user,
                registerPanel : registerPanel
            }
        });
    });

    app.get('/learn-more/mobile', function(req, res){
        res.render('learnmore/mobile', {
            locals : {
                title         : 'Learn More : Mobile Developers',
                activePage    : 'learn-more',
                sessionUser   : req.session.user,
                registerPanel : registerPanel
            }
        });
    });

    app.get('/learn-more/server', function(req, res){
        res.render('learnmore/server', {
            locals : {
                title         : 'Learn More : Server Developers',
                activePage    : 'learn-more',
                sessionUser   : req.session.user,
                registerPanel : registerPanel
            }
        });
    });

    app.get('/learn-more/admin', function(req, res){
        res.render('learnmore/admin', {
            locals : {
                title         : 'Learn More : IT Administrators',
                activePage    : 'learn-more',
                sessionUser   : req.session.user,
                registerPanel : registerPanel
            }
        });
    });

    app.get('/profile', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('profile/index', {
            locals : {
                title       : 'My Profile',
                activePage  : 'profile',
                sessionUser : req.session.user,
                userEmail     : req.session.user.email,
                userFirstName : req.session.user.firstName,
                userLastName  : req.session.user.lastName,
                userPhone     : req.session.user.phone,
                userCompany   : req.session.user.companyName
            }
        });
    });

    app.get('/dev', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('dev/index', {
            locals : {
                title       : 'Developers',
                sessionUser : req.session.user,
                userEmail   : req.session.user.email,
                userCompany : req.session.user.companyName
            },
            _layoutFile : false
        });
    });

    app.get('/admin', UserManager.checkAuthority(['admin']), function(req, res){
        res.render('admin/index', {
            locals : {
                title       : 'Administration',
                sessionUser : req.session.user,
                userEmail   : req.session.user.email,
                userCompany : req.session.user.companyName
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
                countries   : Countries
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