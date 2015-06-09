var ConfigManager = require('../lib/ConfigManager')
, MMXManager = require('../lib/MMXManager');

module.exports = function(app){

    app.get('/wizard', function(req, res){
        res.render('wizard/index', {
            locals : {
                title         : 'Administration',
                activePage    : 'wizard',
                userType      : 'wizard',
                envConfig     : ENV_CONFIG,
                sessionUser   : req.session.user
            }
        });
    });

    app.get('/rest/configs', function(req, res){
        ConfigManager.getConfigs(function(e, config){
            if(e){
                res.send(e, 400);
            }else{
                res.send(config, 200);
            }
        }, true);
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
            res.send('ok', 200);
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
                MMXManager.setConfigs({
                    configs : {
                        'mmx.push.callback.host'     : require('ip').address(),
                        'mmx.push.callback.protocol' : 'http',
                        'xmpp.client.tls.policy'     : 'optional'
                    }
                }, function(e){
                    res.send(configs, 200);
                });
            }
        }, null, true);
    });

    app.post('/rest/admin/completeInstall', function(req, res){
        ConfigManager.completeInstall(function(e){
            if(e) return res.send(e, 400);
            res.send('restart-needed', 200);
        });
    });

    app.get('/rest/status', function(req, res){
        res.contentType('application/json');
        res.send({
            platform : 'init'
        }, 200);
    });

    var state = 'ok';
    app.post('/rest/restart', function(req, res){
        res.send('ok', 200);
        state = 'restarting';
        winston.info('System: restarting server.');
        setTimeout(function(){
            process.exit(0);
        }, 2500);
    });

    app.get('/rest/beacon', function(req, res){
        res.send(state, 200);
    });

    app.get('*', function(req, res){
        res.redirect('/wizard');
    });

};
