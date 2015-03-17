var ConfigManager = require('../lib/ConfigManager')
, MMXManager = require('../lib/MMXManager');

module.exports = function(app){

    app.get('/wizard', function(req, res){
        res.render('wizard/index', {
            locals : {
                title       : 'Administration',
                activePage  : 'wizard',
                userType    : 'wizard',
                envConfig   : ENV_CONFIG,
                serverIP    : require('ip').address(),
                sessionUser : req.session.user
            }
        });
    });

    app.post('/rest/configs/:feature', function(req, res){
        ConfigManager.set(req.params.feature, req.body, function(e){
            if(e) return res.send(e, 400);
            res.send('ok', 200);
        });
    });

    app.post('/rest/admin/setDB', function(req, res){
        ConfigManager.setDB(req.body, function(e){
            if(e) return res.send(e, 400);
            res.send('restart-needed', 200);
        });
    });

    app.post('/rest/admin/setAdmin', function(req, res){
        ConfigManager.setAdmin(req.body, function(e){
            if(e) return res.send(e, 400);
            res.send('ok', 200);
        });
    });

    app.post('/rest/admin/setMessaging', function(req, res){
        ConfigManager.bootstrapMessaging(req.body, function(e){
            if(e) return res.send(e, 400);
            res.send('ok', 200);
        });
    });

    app.post('/rest/admin/messagingStatus', function(req, res){
        MMXManager.getServerStatus(req.body, function(e, data, code){
            res.header('Content-Type', 'application/json');
            res.send(JSON.stringify({
                provisioned : typeof data === 'object' && data.setupComplete && data.setupComplete === true,
                msg         : data.code,
                code        : code
            }), 200);
        }, {
            port : req.body.webPort
        });
    });

    app.get('/rest/admin/messagingCompleteStatus', function(req, res){
        MMXManager.getConfigs('', function(e, configs){
            if(e){
                res.send(e, 400);
            }else{
                res.send(configs, 200);
            }
        });
    });

    app.post('/rest/admin/completeInstall', function(req, res){
        ConfigManager.completeInstall(function(e){
            if(e) return res.send(e, 400);
            res.send('restart-needed', 200);
        });
    });

    app.get('/rest/status', function(req, res){
        res.send('init', 200);
    });

    app.post('/rest/restart', function(req, res){
        res.send('ok', 200);
        winston.info('System: restarting server now.');
        process.exit(0);
    });

    app.get('*', function(req, res){
        res.redirect('/wizard');
    });

};
