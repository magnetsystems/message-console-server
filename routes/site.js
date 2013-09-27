var UserManager = require('../lib/UserManager')
, Countries = require('../lib/config/CountryList')
, EmailService = require('../lib/EmailService')
, Transport = require('../lib/Transport');

module.exports = function(app){

/* PAGES */

    app.get('/', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('index', {
            locals : {
                title       : 'Home',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.company
            }
        });
    });

    app.get('/dev', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('dev/index', {
            locals : {
                title       : 'Developers',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.company
            },
            _layoutFile : false
        });
    });

    app.get('/support', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('support/index', {
            locals : {
                title        : 'Support',
                userEmail    : req.session.user.email,
                userCompany  : req.session.user.company,
                userFullName : req.session.firstName +' '+ req.session.lastName
            }
        });
    });

    app.get('/docs', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('docs/index', {
            locals : {
                title       : 'Documentation',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.company
            }
        });
    });

    app.get('/resources', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/index', {
            locals : {
                title       : 'Resources',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.company
            }
        });
    });

    app.get('/resources/mobile-app-manager', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/mobile-app-manager', {
            locals : {
                title       : 'Resources : Mobile App Manager',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.company
            }
        });
    });

    app.get('/resources/samples', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/samples', {
            locals : {
                title       : 'Resources : Samples',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.company
            }
        });
    });

    app.get('/profile', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('profile/index', {
            locals : {
                title         : 'My Profile',
                userEmail     : req.session.user.email,
                userFirstName : req.session.user.firstName,
                userLastName  : req.session.user.lastName,
                userPhone     : req.session.user.phone,
                userCompany   : req.session.user.company
            }
        });
    });

    app.get('/admin', UserManager.checkAuthority(['admin']), function(req, res){
        res.render('admin/index', {
            locals : {
                title       : 'Administration',
                userEmail   : req.session.user.email,
                userCompany : req.session.user.company
            },
            _layoutFile : false
        });
    });

    app.get('/login', function(req, res){
        Login(res);
    });

/* ADMINISTRATION */

    // retrieve list of all users and render to page
    app.get('/admin/users', function(req, res){
        if(req.session.user !== undefined){
            if(req.session.user.tracking.authority == 1){
                UserManager.getAllUsers(function(e, users){
                    if(e){
                        res.send(e, 400);
                    }else{
                        res.render('admin/users', {
                            locals : {
                                title      : 'User List',
                                properties : '', //Schemas.getProperties('User'),
                                users      : users
                            }
                        });
                    }
                });
            }else{
                do404(res);
            }
        }else{
            do404(res);
        }
    });

    // delete all users
    app.get('/admin/users/delete', function(req, res){
        if(req.session.user !== undefined){
            if(req.session.user.tracking.authority == 1){
                UserManager.deleteAllUsers(function(e){
                    if(e){
                        res.send(e, 400);
                    }else{
                        res.redirect('/admin/users');
                    }
                });
            }else{
                do404(res);
            }
        }else{
            do404(res);
        }
    });

/* GENERAL */
	
    // render login
    function Login(res){
        res.render('login', { 
            locals : { 
                title    : 'Login',
                bodyType : 'dev',
                hideMenu : true,
                userEmail : '',
                userCompany : '',
                countries : Countries
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
                    userCompany : req.session.user.company ? true : null
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