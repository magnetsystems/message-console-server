var CountryList = require('../lib/config/CountryList')
, AccountManager = require('../lib/AccountManager')
, UserManager = require('../lib/UserManager')
, EmailService = require('../lib/EmailService')
, Schemas = require('../lib/Schemas')
, Transport = require('../lib/Transport');

module.exports = function(app){

/* HOME */

    function checkAuthority(types){
        return function(req, res, next){
            if(types.indexOf(req.session.user.userType) != -1){
                next();
            }else{
                res.redirect('/login');
            }
        }
    }

/* PAGES */

    app.get('/', checkAuthority(['admin', 'developer']), function(req, res){
        res.render('index', {
            locals : {
                title    : 'Home',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/dev', checkAuthority(['admin', 'developer']), function(req, res){
        res.render('dev/index', {
            locals : {
                title    : 'Developers',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : false
        });
    });

    app.get('/support', checkAuthority(['admin', 'developer']), function(req, res){
        res.render('support/index', {
            locals : {
                title    : 'Support',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/docs', checkAuthority(['admin', 'developer']), function(req, res){
        res.render('docs/index', {
            locals : {
                title    : 'Documentation',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/resources', checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/index', {
            locals : {
                title    : 'Resources',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/resources/mobile-app-manager', checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/mobile-app-manager', {
            locals : {
                title    : 'Resources : Mobile App Manager',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/resources/samples', checkAuthority(['admin', 'developer']), function(req, res){
        res.render('resources/samples', {
            locals : {
                title    : 'Resources : Samples',
                userId   : req.session.user._id,
                username : req.session.user.username
            },
            layout : 'layouts/site'
        });
    });

    app.get('/admin', checkAuthority(['admin']), function(req, res){
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

/* USER AUTHENTICATION */

    // user log in and store to session and cookie
    app.post('/login', function(req, res){
        AccountManager.manualLogin(req.param('username'), req.param('password'), function(e, user){
            // if login returns a user object, store to session
            if(!user){
                res.send(e, 403);
            }else{
                req.session.user = user;
                console.log('Tracking: user "' + user.username + '" logged in');
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

/* USER REGISTRATION */

    // register a new user
    app.post('/rest/createAdmin', function(req, res){
        UserManager.create({
            userName    : req.param('email'),
            email       : req.param('email'),
            firstName   : req.param('firstName'),
            lastName    : req.param('lastName'),
            companyName : req.param('companyName'),
            userType    : 'admin'
        }, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
            }
        });
    });

    /*
    {
        userName    : 'manager1',
        email       : 'edward.yang@magnet.com',
        firstName   : 'Edward',
        lastName    : 'Yang',
        companyName : 'Magnet'
    }
    */

    // register a new user
    app.post('/rest/startRegistration', function(req, res){
        UserManager.create({
            authority      : req.param('authority'),
            userName       : req.param('email'),
            email          : req.param('email'),
            phoneNumber    : req.param('phoneNumber'),
            firstName      : req.param('firstName'),
            lastName       : req.param('lastName'),
            companyName    : req.param('companyName'),
            title          : req.param('title'),
            password       : req.param('password'),
            invitor        : req.param('invitor'),
            allowMarketing : req.param('marketing'),
            inviteMessage  : req.param('inviteMessage')
        }, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 200);
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
                                properties : Schemas.getProperties('User'),
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