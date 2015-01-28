var UserManager = require('../lib/UserManager')
, Jobs = require('../lib/Jobs')
, ejs = require('ejs')
, fs = require('fs');

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

	app.get('*', function(req, res){
        res.status(404);
        res.send('', 404);
    });

};