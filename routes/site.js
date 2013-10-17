var UserManager = require('../lib/UserManager')
, Countries = require('../lib/config/CountryList');

module.exports = function(app){

/* PAGES */

    app.get('/', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('index', {
            locals : {
                title       : 'Home',
                activePage  : 'home',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.companyName
            }
        });
    });

    app.get('/support', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('support/index', {
            locals : {
                title        : 'Support',
                activePage   : 'support',
                userEmail    : req.session.user.email,
                userCompany  : req.session.user.companyName,
                userFullName : req.session.firstName +' '+ req.session.lastName
            }
        });
    });

    app.get('/get-started', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('getstarted/index', {
            locals : {
                title        : 'Get Started',
                activePage   : 'get-started',
                userEmail    : req.session.user.email,
                userCompany  : req.session.user.companyName,
                userFullName : req.session.firstName +' '+ req.session.lastName
            }
        });
    });

    app.get('/docs', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('docs/index', {
            locals : {
                title       : 'Documentation',
                activePage  : 'docs',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.companyName
            }
        });
    });

    app.get('/resources', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/index', {
            locals : {
                title       : 'Resources',
                activePage  : 'resources',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.companyName
            }
        });
    });

    app.get('/profile', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('profile/index', {
            locals : {
                title         : 'My Profile',
                activePage    : 'profile',
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
                hideMenu    : true,
                activePage  : '',
                userEmail   : '',
                userCompany : '',
                countries   : Countries
            }
        });
    }
    
    // render 404
    function do404(req, res){
        if(req.session.user){
            res.render('error/404', {
                locals : {
                    title : 'Page Not Found',
                    bodyType : 'dev',
                    hideMenu : req.session.user ? true : null,
                    userEmail : req.session.user.email ? true : null,
                    userCompany : req.session.user.companyName ? true : null
                }
            });
        }else{
            res.redirect('/login');
        }
    }
    
    // handle unknown requests
	app.get('*', function(req, res){ 
        do404(req, res);
    });

};