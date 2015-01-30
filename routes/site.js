var UserManager = require('../lib/UserManager');

module.exports = function(app){

    app.get('/admin', UserManager.checkAuthority(['admin']), function(req, res){
        res.render('admin/index', {
            locals : {
                title       : 'Administration',
                activePage  : 'admin',
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