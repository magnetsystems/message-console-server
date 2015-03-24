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
        host    : params.config.host,
        port    : params.port || params.config.adminPort || (params.config.ssl === true ? 443 : 80),
        path    : queryPath,
        method  : method || 'GET',
        rejectUnauthorized : false,
        requestCert        : false,
        headers : {
            'Content-Type'   : params.binary ? params.binary.getHeaders()['content-type'] : type,
            'Content-Length' : reqBody ? reqBody.length : 0,
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
                winston.error('MMXManager: failed to make remote call to '+params.config.host+' '+path+': code - '+res.statusCode+' response: ', data, ' request: ', reqBody, res.statusCode);
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
    call.on('error', function(e){
        winston.error('MMXManager: failed to make remote call to '+params.config.host+' '+path+': ',e);
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
        name        : body.name,
        ownerId     : userMagnetId,
        ownerEmail  : userEmail,
        guestSecret : magnetId.v4()
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
MMXManager.prototype.getAppMessages = function(uid, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/mmxadmin/messages', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the mmx push notifications for the given app in the context of the current user
MMXManager.prototype.getAppNotifications = function(uid, mmxId, query, req, cb){
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
MMXManager.prototype.getAppEndpoints = function(uid, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/mmxadmin/rest/v1/endpoints/'+mmxId+'/search', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the users for the given app
MMXManager.prototype.getAppUsers = function(uid, mmxId, query, req, cb){
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
MMXManager.prototype.createAppUser = function(uid, mmxId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    body.appId = mmxId;
    body.isAdmin = false;
    me.request('/mmxadmin/rest/v1/user', 'POST', body, function(e, data, code){
        if(e) return cb(code == 409 ? 'user-exists' : e);
        winston.verbose('MMXManager: successfully created mmx app user: ' + body.username+'(in app '+mmxId+')');
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// update an mmx app user
MMXManager.prototype.updateAppUser = function(uid, mmxId, userId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    body.appId = mmxId;
    me.request('/mmxadmin/rest/v1/user', 'PUT', body, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully updated mmx app user: ' + body.username+'(in app '+mmxId+')');
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// delete an mmx app user
MMXManager.prototype.deleteAppUser = function(uid, mmxId, userId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/user/'+userId+'/app/'+mmxId, 'DELETE', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully delete mmx app user: ' + userId+'(in app '+mmxId+')');
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// activate an mmx app user
MMXManager.prototype.activateAppUser = function(uid, mmxId, userId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/user/'+userId+'/app/'+mmxId, 'POST', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully activated mmx app user: ' + userId+'(in app '+mmxId+')');
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// delete an mmx app user
MMXManager.prototype.deactivateAppUser = function(uid, mmxId, userId, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/user/'+userId+'/app/'+mmxId+'/deactivate', 'POST', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deactivated mmx app user: ' + userId+'(in app '+mmxId+')');
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// get all the mmx devices for the given user
MMXManager.prototype.getAppUserDevices = function(uid, mmxId, mmxUid, cb){
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
MMXManager.prototype.getDeviceMessages = function(uid, mmxId, mmxDid, cb){
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
MMXManager.prototype.getDeviceTags = function(uid, mmxId, mmxDid, req, cb){
    if(!req.headers['appapikey']) return cb('missing-apikey');
    this.request('/mmxmgmt/api/v1/devices/tags?deviceIds='+mmxDid.replace(',', ''), 'GET', '', function(e, data){
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
MMXManager.prototype.sendMessage = function(uid, mmxId, mmxDeviceId, body, cb){
    this.request('/mmxmgmt/api/v1/send_message', 'POST', body, function(e){
        if(e) return cb(e);
        cb(null, 'ok');
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : body.appAPIKey
        }
    });
};

// send a ping to a device
MMXManager.prototype.sendPing = function(uid, mmxId, mmxDeviceId, body, cb){
    var me = this;
    me.request('/mmxmgmt/api/v1/send_ping', 'POST', body, function(e, data){
        if(e) return cb(e);
        cb(null, 'ok');
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : body.appAPIKey
        }
    });
};

// send a notification to a device
MMXManager.prototype.sendNotification = function(uid, mmxId, mmxDeviceId, body, cb){
    var me = this;
    me.request('/mmxmgmt/api/v1/send_push', 'POST', body, function(e, data){
        if(e) return cb(e);
        cb(null, 'ok');
    }, {
        contentType : 'application/json',
        port        : ENV_CONFIG.MMX.publicPort,
        headers     : {
            'X-mmx-app-id'  : mmxId,
            'X-mmx-api-key' : body.appAPIKey
        }
    });
};

// create mmx app topic
MMXManager.prototype.createAppTopic = function(uid, mmxId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    me.request('/mmxadmin/topic?appId='+mmxId, 'POST', {
        topicId     : body.name,
        topicName   : body.name,
        description : body.description
    }, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully created mmx app topic: ' + body.name+'('+data.id+')');
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// get all the mmx app topics
MMXManager.prototype.getAppTopics = function(uid, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/mmxadmin/rest/v1/topics', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// delete mmx app topic
MMXManager.prototype.deleteAppTopic = function(uid, mmxId, topicId, cb){
    var me = this;
    me.request('/mmxadmin/topic?topicid='+encodeURIComponent(topicId), 'DELETE', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deleted mmx app topic: ' + topicId);
        cb(null, data);
    });
};

// add tags to topic
MMXManager.prototype.addTopicTags = function(uid, mmxId, topicId, body, req, cb){
    var me = this;
    if(!req.headers['appapikey']) return cb('missing-apikey');
    me.request('/mmxmgmt/api/v1/topics/tags', 'POST', body, function(e, data){
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

// remove tags from topic
MMXManager.prototype.removeTopicTags = function(uid, mmxId, topicId, body, req, cb){
    var me = this;
    if(!req.headers['appapikey']) return cb('missing-apikey');
    me.request('/mmxmgmt/api/v1/topics/tags?topicId='+topicId, 'DELETE', body, function(e, data){
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

// publish message to topic
MMXManager.prototype.publishToTopic = function(uid, mmxId, topicId, body, cb){
    var me = this;
    me.request('/mmxadmin/rest/v1/topics/post', 'POST', {
        topicId     : decodeURIComponent(topicId),
        appId       : mmxId,
        content     : body.payload,
        messageType : 'normal',
        contentType : 'text'
    }, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully published to app topic: ' + topicId);
        cb(null, data);
    }, {
        contentType : 'application/json'
    });
};

// retrieve the app configuration
MMXManager.prototype.getConfigs = function(userMagnetId, cb){
    var me = this;
    me.request('/mmxadmin/config', 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, data);
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
    me.request('/bootstrap', 'GET', '', function(e, data, code){
        if(e) return cb(e, data, code);
        cb(null, data, code);
    }, {
        port   : params.port || undefined,
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
        port        : config.webPort,
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
MMXManager.prototype.storeAPNSCertificate = function(uid, mmxId, req, cb){
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
                            if(e) return cb(e, data);
                            cb();
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