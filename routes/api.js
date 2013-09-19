var CountryList = require('../lib/config/CountryList')
    , AccountManager = require('../lib/AccountManager')
    , UserManager = require('../lib/UserManager')
    , EmailService = require('../lib/EmailService');

module.exports = function(app){

    /* AUTHENTICATION */

    // user log in and store to session and cookie
    app.post('/login', function(req, res){
        AccountManager.manualLogin(req.param('username'), req.param('password'), function(e, user){
            // if login returns a user object, store to session
            if(!user){
                res.send(e, 403);
            }else{
                req.session.user = {
                    firstName : user.firstName,
                    lastName  : user.lastName,
                    company   : user.company,
                    userName  : user.userName,
                    email     : user.email,
                    country   : user.country,
                    userType  : user.userType
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
    app.post('/rest/createAdmin', function(req, res){
        UserManager.create({
            userName  : req.body.email,
            email     : req.body.email,
            firstName : req.body.firstName,
            lastName  : req.body.lastName,
            company   : req.body.company,
            password  : req.body.password,
            userType  : 'admin'
        }, function(e){
            if(e){
                res.send(e, 400);
            }else{
                res.send('ok', 201);
            }
        });
    });

    /*
     {
     "userName"    : "manager1",
     "email"       : "edward.yang@magnet.com",
     "firstName"   : "Edward",
     "lastName"    : "Yang",
     "company"     : "Magnet",
     "password"    : "magnet"
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
                res.send('ok', 201);
            }
        });
    });

    /* USER */

    app.get('/rest/user', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        UserManager.read(req.session.user, function(e, user){
            if(e){
                res.send(e, 400);
            }else{
                res.send(user, 200);
            }
        });
    });

    app.put('/rest/user', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
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
/*
    socket.on('user:create', function(data, fn){
        //console.log(data);
    });
    socket.on('user:read', function(data, fn){
        if(session.user == null || data._id == ''){
            fn({s:'no-session'});
        }else{
            UserManager.getById(data._id, '_id name username email country', function(e, user){
                if(user){
                    fn(null, user);
                }else{
                    fn({s:e});
                }
            })
        }
    });
    socket.on('user:update', function(data, fn){
        if(session.user == null || data._id == ''){
            fn({s:'no-session'});
        }else{
            UserManager.update(session.user, {
                name     : data.name,
                username : data.username,
                email    : data.email,
                country  : data.country,
                oldpass  : data.oldpass,
                newpass  : data.newpass
            }, function(e, user){
                if(user){
                    // update session and cookie data
                    session.user = user;
                    fn(null, {s:'ok'});
                }else{
                    fn({s:e});
                }
            });
        }
    });
    socket.on('user:delete', function(data, fn){
        UserManager.delete(session.user._id, function(e){
            if(e){
                fn({s:e});
            }else{
                session.destroy(function(e){
                    fn(null, {s:'ok'});
                });
            }
        });
    });
*/
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

};