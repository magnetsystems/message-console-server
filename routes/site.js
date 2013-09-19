var CountryList = require('../lib/config/CountryList')
, AccountManager = require('../lib/AccountManager')
, UserManager = require('../lib/UserManager')
, EmailService = require('../lib/EmailService')
, Transport = require('../lib/Transport');

module.exports = function(app){

/* PAGES */

    app.get('/', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('index', {
            locals : {
                title    : 'Home',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/dev', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('dev/index', {
            locals : {
                title    : 'Developers',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : false
        });
    });

    app.get('/support', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('support/index', {
            locals : {
                title    : 'Support',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/docs', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('docs/index', {
            locals : {
                title    : 'Documentation',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/resources', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/index', {
            locals : {
                title    : 'Resources',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/resources/mobile-app-manager', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/mobile-app-manager', {
            locals : {
                title    : 'Resources : Mobile App Manager',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/resources/samples', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/samples', {
            locals : {
                title    : 'Resources : Samples',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/admin', UserManager.checkAuthority(['admin']), function(req, res){
        res.render('admin/index', {
            locals : {
                title    : 'Administration',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : false
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
                            },
                            layout : 'layouts/site'
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
                hideMenu : true
            }, 
            layout : 'layouts/site'
        });
    }
    
    // render 404
    function do404(req, res){
        res.render('error/404', { 
            locals : { 
                title : 'Page Not Found',
                bodyType : 'dev',
                hideMenu : req.session.user ? true : null
            }, 
            layout : 'layouts/site'
        });
    }
    
    // handle unknown requests
	app.get('*', function(req, res){ 
        do404(req, res);
    });

};