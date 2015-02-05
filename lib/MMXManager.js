var http = require('follow-redirects').http
, https = require('follow-redirects').https
, ejs = require('ejs')
, fs = require('fs')
, FormData = require('form-data')
, magnetId = require('node-uuid');

var MMXManager = function(){};

MMXManager.prototype.request = function(path, method, data, cb, params){
    params = params || {};
    params.config = params.config || ENV_CONFIG.MMX;
    var type = params.contentType ? params.contentType : 'application/x-www-form-urlencoded';
    var reqBody = parseBody(type, data);
    var protocol = params.config.ssl === true ? https : http;
    var queryPath = path+((method === 'GET' || params.queryOnly) ? '?'+reqBody : '');
    queryPath = queryPath == '?' ? '' : queryPath;
    var req = {
        host    : params.config.host,
        port    : params.config.port || (params.config.ssl === true ? 443 : 80),
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
    winston.verbose('MMXManager: remote call - ', req);
    var call = protocol.request(req, function(res){
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            data += chunk;
        }).on('end', function(){
            try{
                data = JSON.parse(data);
            }catch(e){}
            if(!isSuccess(res.statusCode)) winston.error('MMXManager: failed to make remote call to '+params.config.host+' '+path+': code - '+res.statusCode+' response: ', data, ' request: ', reqBody, res.statusCode);
            if(typeof cb === typeof Function){
                if(isSuccess(res.statusCode))
                    cb(null, data, res.statusCode);
                else
                    cb((typeof data == 'object' && data.message) ? data.message : 'request-failed', data, res.statusCode);
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
    me.request('/plugins/mmxmgmt/rest/v1/apps', 'POST', {
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
    me.request('/plugins/mmxmgmt/rest/v1/apps', 'GET', {
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
    me.request('/plugins/mmxmgmt/rest/v1/stats/ownerId/'+userMagnetId, 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get a single mmx app
MMXManager.prototype.getApp = function(userMagnetId, mmxId, cb){
    var me = this;
    me.request('/plugins/mmxmgmt', 'GET', {
        command  : 'read',
        appId    : mmxId,
        appOwner : userMagnetId
    }, function(e, data){
        if(e) return cb(e);
        cb(null, filterResponse(data));
    });
};

// update an mmx app
MMXManager.prototype.updateApp = function(userMagnetId, isAdmin, mmxId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    var req = {
        command : 'update',
        appId   : mmxId
    };
    if(body.name) req.name = body.name;
    req.googleAPIKey = body.googleApiKey || '';
    req.googleProjectId = body.googleProjectId || '';
    req.guestSecret = body.guestUserSecret || '';
    me.request('/plugins/mmxmgmt/rest/v1/apps/'+mmxId, 'PUT', req, function(e, data){
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
    me.request('/plugins/mmxmgmt/rest/v1/apps/'+mmxId, 'DELETE', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deleted mmx app: ' + mmxId);
        cb(null, data);
    });
};

// get all the mmx messages for the given app in the context of the current user
MMXManager.prototype.getAppMessages = function(uid, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/plugins/mmxmgmt/messages', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get statistics for the given app
MMXManager.prototype.getAppStats = function(userMagnetId, mmxId, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/rest/v1/stats/ownerId/'+userMagnetId+'/app/'+mmxId, 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the users for the given app
MMXManager.prototype.getAppEndpoints = function(uid, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/plugins/mmxmgmt/rest/v1/endpoints/'+mmxId+'/search', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the users for the given app
MMXManager.prototype.getAppUsers = function(uid, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    me.request('/plugins/mmxmgmt/users', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the mmx devices for the given user
MMXManager.prototype.getAppUserDevices = function(uid, mmxId, mmxUid, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/devices', 'GET', {
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
//    return cb(null, devices);
    me.request('/plugins/mmxmgmt/pushmessages', 'GET', {
        appId    : mmxId,
        deviceid : mmxDid
    }, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    }, {
        queryOnly : true
    });
};

// send a message to a user or device
MMXManager.prototype.sendMessage = function(uid, mmxId, mmxDeviceId, body, cb){
    var me = this;
    var obj = {
        clientId    : body.userId,
        deviceId    : body.deviceId,
        content     : body.payload,
        contentType : 'text',
        type        : 'chat',
        requestAck  : true
    };
    me.request('/plugins/mmxmgmt/send?appId='+mmxId, 'POST', obj, function(e, data){
        if(e) return cb(e);
        cb(null, 'ok');
    }, {
        contentType : 'application/json'
    });
};

// send a ping to a device
MMXManager.prototype.sendPing = function(uid, mmxId, mmxDeviceId, body, cb){
    var me = this;
    if(!body.deviceId) return cb('invalid-device-id');
    me.request('/plugins/mmxmgmt/push', 'POST', {
        appId    : mmxId,
        deviceid : body.deviceId,
        pingtest : 1
    }, function(e, data){
        if(e) return cb(e);
        cb(null, 'ok');
    }, {
        queryOnly : true
    });
};

// send a notification to a device
MMXManager.prototype.sendNotification = function(uid, mmxId, mmxDeviceId, body, cb){
    var me = this;
    if(!body.deviceId) return cb('invalid-device-id');
    me.request('/plugins/mmxmgmt/push?appId='+mmxId+'&deviceid='+body.deviceId, 'POST', body.payload, function(e, data){
        if(e) return cb(e);
        cb(null, 'ok');
    }, {
        contentType : 'text/plain'
    });
};

// create mmx app topic
MMXManager.prototype.createAppTopic = function(uid, mmxId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    me.request('/plugins/mmxmgmt/topic?appId='+mmxId, 'POST', {
        topicId     : body.name,
        topicName   : body.name,
        description : body.name
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
    me.request('/plugins/mmxmgmt/topic', 'GET', {
        appId   : mmxId,
        command : 'listtopic'
    }, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// delete mmx app topic
MMXManager.prototype.deleteAppTopic = function(uid, mmxId, topicId, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/topic?topicid='+encodeURIComponent(topicId), 'DELETE', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deleted mmx app topic: ' + topicId);
        cb(null, data);
    });
};

// publish message to topic
MMXManager.prototype.publishToTopic = function(uid, mmxId, topicId, body, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/rest/v1/topics/post', 'POST', {
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
    me.request('/plugins/mmxmgmt/config', 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// check setup status
MMXManager.prototype.getServerStatus = function(config, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/rest/v1/status/setup', 'GET', '', function(e, data, code){
        if(e) return cb(e, data, code);
        cb(null, data, code);
    }, {
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
        contentType : 'application/json',
        config      : config
    });
};


// upload an apns cert
MMXManager.prototype.storeAPNSCertificate = function(uid, mmxId, req, cb){
    var me = this;
    var fileName = req.header('x-file-name');
    var fileType = req.header('X-Mime-Type');
    var bin = '';
    req.on('data', function(data){
        bin += data;
    });
    req.on('end', function(){
        var form = new FormData();
        form.append('certfile', bin);
        me.request('/plugins/mmxmgmt/rest/v1/apps/'+mmxId+'/apnscert', 'POST', bin, function(e, data, code){
            if(e) return cb(e, data);
            cb();
        }, {
            contentType : 'multipart/form-data',
            binary      : form
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
