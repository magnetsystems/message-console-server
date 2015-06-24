var http = require('follow-redirects').http
    , https = require('follow-redirects').https
    , FormData = require('form-data')
    , magnetId = require('node-uuid')
    , fs = require('fs')
    , _ = require('underscore');

var MMXManager = function(){
    this.createFolderIfNotExist('./tmp');
};

MMXManager.prototype.request = function(path, method, data, cb, params){
    params = params || {};
    params.config = params.config || ENV_CONFIG.MMX;
    var type = params.contentType ? params.contentType : 'application/x-www-form-urlencoded';
    var reqBody = parseBody(type, data);
    var protocol = params.config.ssl === true ? https : http;
    var queryPath = path+(((method === 'GET' || params.queryOnly) && reqBody && reqBody.length > 1) ? '?'+reqBody : '');
    var req = {
        host     : params.config.host,
        port     : params.port || params.config.adminPort || (params.config.ssl === true ? 443 : 80),
        path     : queryPath,
        method   : method || 'GET',
        rejectUnauthorized : false,
        requestCert        : false,
        headers : {
            'Content-Type'   : params.binary ? params.binary.getHeaders()['content-type'] : type,
            'Content-Length' : reqBody ? (params.binary ? reqBody.length : Buffer.byteLength(reqBody, 'utf8')) : 0,
            'Authorization'  : 'Basic ' + new Buffer(params.config.user + ':' + params.config.password).toString('base64')
        }
    };
    if(params.headers){
        _.extend(req.headers, params.headers);
    }
    winston.silly('MMXManager: remote call - ', req, !params.binary ? reqBody : ' binary ');
    var call = protocol.request(req, function(res){
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            data += chunk;
        }).on('end', function(){
            try{
                data = JSON.parse(data);
            }catch(e){}
            if(!isSuccess(res.statusCode)){
                winston[params.statusCheck ? 'verbose' : 'error']('MMXManager: failed to make remote call to '+params.config.host+(req.port ? ':'+req.port : '')+path+': code - '+res.statusCode+' response: ', data, ' request: ', (!params.binary ? reqBody : ' binary'), res.statusCode);
            }
            if(typeof cb === typeof Function){
                if(isSuccess(res.statusCode)){
                    cb(null, data, res.statusCode);
                }else{
                    cb((typeof data == 'object' && data.message) ? data.message : 'request-failed', data, res.statusCode);
                }
            }
        });
    });
    call.on('error', function(e, res, body){
        winston[params.statusCheck ? 'verbose' : 'error']('MMXManager: failed to make remote call to '+params.config.host+path+': ', e, res||'', body||'');
        cb('connect-error', e, 400);
    });
    if(params.binary){
        params.binary.pipe(call);
    }else{
        if(reqBody) call.write(reqBody, 'utf8');
    }
    call.end();
};

// create an mmx app
MMXManager.prototype.createApp = function(userEmail, userMagnetId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    me.request('/mmxadmin/rest/v1/apps', 'POST', {
        name         : body.name,
        ownerId      : userMagnetId,
        ownerEmail   : userEmail,
        serverUserId : 'ServerUser',
        guestSecret  : magnetId.v4()
    }, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully created mmx app: ' + body.name+'('+data.appId+')');
        cb(null, filterResponse(data));
    }, {
        contentType : 'application/json'
    });
};

// get all the mmx apps for the given user
MMXManager.prototype.getApps = function(userMagnetId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/apps', 'GET', {
        appOwner : userMagnetId
    }, function(e, data){
        if(e) return cb(e);
        data = data || [];
        for(var i=0;i<data.length;++i){
            data[i] = filterResponse(data[i]);
        }
        cb(null, data);
    });
};

// get statistics for all mmx apps
MMXManager.prototype.getStats = function(userMagnetId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/stats/ownerId/'+userMagnetId, 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get a single mmx app
MMXManager.prototype.getApp = function(userMagnetId, mmxId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/apps/'+mmxId, 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, filterResponse(data));
    });
};

// update an mmx app
MMXManager.prototype.updateApp = function(userMagnetId, isAdmin, mmxId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    me.request('/mmxadmin/rest/v1/apps/'+mmxId, 'PUT', body, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully updated mmx app: ' + mmxId);
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// delete an mmx app
MMXManager.prototype.deleteApp = function(userMagnetId, isAdmin, mmxId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/apps/'+mmxId, 'DELETE', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deleted mmx app: ' + mmxId);
        cb(null, data);
    });
};

// get all the mmx messages for the given app in the context of the current user
MMXManager.prototype.getAppMessages = function(userMagnetId, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/mmxadmin/messages', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the mmx push notifications for the given app in the context of the current user
MMXManager.prototype.getAppNotifications = function(userMagnetId, mmxId, query, req, cb){
    if(!req.headers['appapikey']) return cb('missing-apikey');
    this.request('/mmxmgmt/api/v1/push', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// get statistics for the given app
MMXManager.prototype.getAppStats = function(userMagnetId, mmxId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/stats/ownerId/'+userMagnetId+'/app/'+mmxId, 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the users for the given app
MMXManager.prototype.getAppEndpoints = function(userMagnetId, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/mmxadmin/rest/v1/endpoints/'+mmxId+'/search', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the users for the given app
MMXManager.prototype.getAppUsers = function(userMagnetId, mmxId, query, req, cb){
    if(!req.headers['appapikey']) return cb('missing-apikey');
    this.request('/mmxmgmt/api/v1/users', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// create an mmx app user
MMXManager.prototype.createAppUser = function(userMagnetId, mmxId, body, req, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    body.appId = mmxId;
    body.isAdmin = false;
    me.request('/mmxmgmt/api/v1/users', 'POST', body, function(e, data, code){
        if(e) return cb(code == 409 ? 'user-exists' : e);
        winston.verbose('MMXManager: successfully created mmx app user: ' + body.username+'(in app '+mmxId+')');
        cb(null, data, code);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// update an mmx app user
MMXManager.prototype.updateAppUser = function(userMagnetId, mmxId, userId, body, req, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    body.appId = mmxId;
    me.request('/mmxmgmt/api/v1/users', 'PUT', body, function(e, data, code){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully updated mmx app user: ' + body.username+'(in app '+mmxId+')');
        cb(null, data, code);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// delete an mmx app user
MMXManager.prototype.deleteAppUser = function(userMagnetId, mmxId, userId, req, cb){
    var me = this;
    me.request('/mmxmgmt/api/v1/users/'+userId, 'DELETE', '', function(e, data, code){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully delete mmx app user: ' + userId+'(in app '+mmxId+')');
        cb(null, data, code);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// get all the mmx devices for the given user
MMXManager.prototype.getAppUserDevices = function(userMagnetId, mmxId, mmxUid, cb){
    var me = this;
    me.request('/mmxadmin/devices', 'GET', {
        appId    : mmxId,
        searchby : 'username',
        value    : mmxUid
    }, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the push messages for the given device
MMXManager.prototype.getDeviceMessages = function(userMagnetId, mmxId, mmxDid, cb){
    var me = this;
    me.request('/mmxadmin/pushmessages', 'GET', {
        appId    : mmxId,
        deviceid : mmxDid
    }, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        queryOnly : true
    });
};

// get all tags for the given device
MMXManager.prototype.getDeviceTags = function(userMagnetId, mmxId, mmxDid, req, cb){
    if(!req.headers['appapikey']) return cb('missing-apikey');
    this.request('/mmxmgmt/api/v1/devices/'+mmxDid+'/tags', 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// send a message to a user or device
MMXManager.prototype.sendMessage = function(userMagnetId, mmxId, mmxDeviceId, req, cb){
    this.request('/mmxmgmt/api/v1/send_message', 'POST', req.body, function(e){
        if(e) return cb(e);
        cb(null, 'ok');
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// send a ping to a device
MMXManager.prototype.sendPing = function(userMagnetId, mmxId, mmxDeviceId, req, cb){
    var me = this;
    me.request('/mmxmgmt/api/v1/send_ping', 'POST', req.body, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// send a notification to a device
MMXManager.prototype.sendNotification = function(userMagnetId, mmxId, mmxDeviceId, req, cb){
    var me = this;
    me.request('/mmxmgmt/api/v1/send_push', 'POST', req.body, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// create mmx app topic
MMXManager.prototype.createAppTopic = function(userMagnetId, mmxId, req, cb){
    var me = this;
    if(!req.body) return cb('invalid-body');
    me.request('/mmxmgmt/api/v1/topics', 'POST', req.body, function(e, data, code){
        if(e) return cb(e, data, code);
        winston.verbose('MMXManager: successfully created mmx app topic: ' + req.body.topicName);
        cb(null, data, code);
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// get all the mmx app topics
MMXManager.prototype.getAppTopics = function(userMagnetId, mmxId, req, cb){
    var me = this;
    me.request('/mmxmgmt/api/v1/topics', 'GET', req.query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// delete mmx app topic
MMXManager.prototype.deleteAppTopic = function(userMagnetId, mmxId, topicId, req, cb){
    var me = this;
    me.request('/mmxmgmt/api/v1/topics/'+topicId, 'DELETE', '', function(e, data, code){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deleted mmx app topic: ' + topicId);
        cb(null, data, code);
    }, {
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// add tags to topic
MMXManager.prototype.addTopicTags = function(userMagnetId, mmxId, topicId, req, cb){
    var me = this;
    if(!req.headers['appapikey']) return cb('missing-apikey');
    if(!req.body) return cb('invalid-body');
    me.request('/mmxmgmt/api/v1/topics/'+topicId+'/tags', 'POST', req.body, function(e, data, code){
        if(e) return cb(e);
        cb(null, 'ok', code);
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// remove tags from topic
MMXManager.prototype.removeTopicTags = function(userMagnetId, mmxId, topicId, req, cb){
    var me = this;
    if(!req.headers['appapikey']) return cb('missing-apikey');
    me.request('/mmxmgmt/api/v1/topics/'+topicId+'/tags', 'DELETE', '', function(e, data, code){
        if(e) return cb(e);
        cb(null, 'ok', code);
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// publish message to topic
MMXManager.prototype.publishToTopic = function(userMagnetId, mmxId, topicId, req, cb){
    var me = this;
    if(!req.body) return cb('invalid-body');
    me.request('/mmxmgmt/api/v1/topics/'+topicId+'/publish', 'POST', req.body, function(e, data, code){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully published to app topic: ' + topicId);
        cb(null, data, code);
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : req.headers['appapikey']
        }
    });
};

// retrieve the app configuration
MMXManager.prototype.getConfigs = function(userMagnetId, cb, config, statusCheck){
    var me = this;
    me.request('/mmxadmin/config', 'GET', '', function(e, data, code){
        if(e) return cb(e, data, code);
        cb(null, data, code);
    }, {
        config      : config,
        statusCheck : statusCheck
    });
};

// set the app configuration
MMXManager.prototype.setConfigs = function(obj, cb){
    var me = this;
    me.request('/mmxadmin/config', 'POST', obj, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// check setup status
MMXManager.prototype.getServerStatus = function(config, cb, params){
    var me = this;
    params = params || {};
    me.request('/bootstrap', 'GET', '', function(e, data, code){
        if(e) return cb(e, data, code);
        cb(null, data, code);
    }, {
        port   : params.port || ENV_CONFIG.MMX.webPort,
        config : config
    });
};

// setup the server
MMXManager.prototype.provisionServer = function(config, settings, cb){
    var me = this;
    me.request('/bootstrap', 'POST', settings, function(e, data, code){
        if(e) return cb(e, data, code);
        cb(null, data, code);
    }, {
        port        : ENV_CONFIG.MMX.webPort,
        contentType : 'application/json',
        config      : config
    });
};

MMXManager.prototype.createFolderIfNotExist = function(path){
    fs.mkdir(path, function(e){
        if(!e || (e.code === 'EEXIST')){
        }else{
            winston.error('MMX: failed to create tmp folder: ',e);
        }
    });
};

// upload an apns cert
MMXManager.prototype.storeAPNSCertificateAndPass = function(userMagnetId, mmxId, req, cb){
    var me = this;
    if(!req.body.apnsCertPassword) return cb('invalid-password');
    var fileName = req.header('x-file-name');
    var form = new FormData();
    form.append('certfile', fs.createReadStream(req.files.qqfile.path));
    form.append('apnsCertPassword', req.body.apnsCertPassword);
    form.getLength(function(e, len){
        if(e) return cb('invalid-file');
        me.request('/mmxadmin/rest/v1/apps/'+mmxId+'/apnscert', 'POST', form, function(e, data, code){
            if(e) return cb(e, data, code);
            cb(e, data, code);
        }, {
            contentType : 'multipart/form-data',
            binary      : form,
            headers     : {
                'Content-Length' : len
            }
        });
    });
};


MMXManager.prototype.storeAPNSCertificate = function(userMagnetId, mmxId, req, cb){
    var me = this, chunks = [];
    req.on('data', function(data){
        if(chunks.length > 1e6){
            chunks = [];
            req.connection.destroy();
            return cb('upload-error');
        }
        chunks.push(data);
    });
    var fileName = req.header('x-file-name');
    var fileType = req.header('X-Mime-Type');
    req.on('end', function(){
        var binary = Buffer.concat(chunks).toString('binary');
        var form = new FormData();
        fs.writeFile('./tmp/'+fileName, binary, 'binary', function(){
            form.append('certfile', fs.createReadStream('./tmp/'+fileName));
            form.getLength(function(e, len){
                if(e){
                    fs.unlink('./tmp/'+fileName, function(){
                        cb(e);
                    });
                }else{
                    me.request('/mmxadmin/rest/v1/apps/'+mmxId+'/apnscert', 'POST', binary, function(e, data, code){
                        fs.unlink('./tmp/'+fileName, function(){
                            if(e) return cb(e, data, code);
                            cb(e, data, code);
                        });
                    }, {
                        contentType : 'multipart/form-data',
                        binary      : form,
                        headers     : {
                            'Content-Length' : len
                        }
                    });
                }
            });
        });
    });
    req.on('error', function(e){
        winston.error('MMXManager: error uploading APNS certificate: ', e);
        cb('upload-error');
    });
};

// delete apns certificate
MMXManager.prototype.deleteAPNSCertificate = function(userMagnetId, mmxId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/apps/'+mmxId+'/apnscert', 'DELETE', '', function(e, data, code){
        if(e) return cb(e);
        cb(null, data, code);
    }, {
        contentType : 'application/json'
    });
};

function filterResponse(data){
    data.gcm = data.gcm || {};
    data.id = data.appId;
    data.magnetId = data.appId;
    return data;
}

function isSuccess(code){
    return code >= 200 && code <= 299;
}

function parseBody(type, input){
    var QS = require('querystring');
    switch(type){
        case 'application/x-www-form-urlencoded' : input = QS.stringify(input); break;
        case 'application/json' : input = JSON.stringify(input); break;
    }
    return input;
}

module.exports = new MMXManager();