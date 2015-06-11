var UserManager = require('../lib/UserManager')
, WPOAuthClient = require('../lib/WPOAuthClient');

module.exports = function(app){

    app.get('/oauth-login', function(req, res){
        if(!req.query.code){
            res.send('invalid-code', 400);
        }else{
            WPOAuthClient.getAccessToken(req.query.code, function(e, data){
                if(e){
                    res.send(e, 400);
                }else{
                    req.session.user = data;
                    req.session.user.userType = 'developer';
                    req.session.user.activated = true;
                    res.redirect('/');
                }
            });
        }
    });

    app.get('/admin', UserManager.checkAuthority(['admin', 'developer']), function(req, res){
        res.render('admin/index', {
            locals : {
                title       : 'Administration',
                activePage  : 'admin',
                userType    : req.session.user ? req.session.user.userType : 'developer',
                envConfig   : ENV_CONFIG,
                sessionUser : req.session.user
            }
        });
    });

    app.get('/wizard', function(req, res){
        res.redirect('/');
    });

	app.get('*', function(req, res){
        res.status(404);
        res.send('', 404);
    });

};


