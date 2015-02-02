var UserManager = require('../lib/UserManager');

module.exports = function(app){

    app.get('/admin', function(req, res){
        res.render('admin/index', {
            locals : {
                title       : 'Administration',
                activePage  : 'admin',
                userType    : req.session.user ? req.session.user.userType : 'developer',
                sessionUser : req.session.user
            }
        });
    });

    // restart the server
    app.get('/wizard', function(req, res){
        res.redirect('/');
    });

	app.get('*', function(req, res){
        res.status(404);
        res.send('', 404);
    });

};