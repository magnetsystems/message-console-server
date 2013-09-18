var UserManager = require('../lib/UserManager')
, EmailService = require('../lib/EmailService')
, Schemas = require('../lib/Schemas')
, Transport = require('../lib/Transport');

module.exports = function(app){

    sessionSockets.on('connection', function(err, socket, session){
        /* GENERAL */
        socket.on('google:geocoding', function(data, fn){
            Transport.getGoogleGeocoding(data, function(e, o){
                if(o){
                    fn(null, o);
                }else{
                    fn(e);
                }
            });
        });
        socket.on('google:place', function(data, fn){
            Transport.getGooglePlace(data, function(e, o){
                if(o){
                    fn(null, o);
                }else{
                    fn(e);
                }
            });
        });
        socket.on('google:distances', function(data, fn){
            Transport.getGooglePlaceDistances(data, function(e, o){
                if(o){
                    fn(null, o);
                }else{
                    fn(e);
                }
            });
        });
        /* USERS */
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
                        /*
                        if(req.cookies.user != undefined && req.cookies.pass != undefined){
                            res.cookie('user', user.username, {
                                maxAge : 900000
                            });
                            res.cookie('pass', user.password, {
                                maxAge : 900000
                            });
                        }
                        */
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
                    /*
                    res.clearCookie('user');
                    res.clearCookie('pass');
                    */
                    session.destroy(function(e){
                        fn(null, {s:'ok'});
                    });
                }
            });
        });
    });

};