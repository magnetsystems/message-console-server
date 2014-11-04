var http = require('follow-redirects').http
, https = require('follow-redirects').https
, magnetId = require('node-uuid');

var MMXManager = function(){};

MMXManager.prototype.request = function(path, method, data, cb, params){
    params = params || {};
    var type = 'application/x-www-form-urlencoded';
    var reqBody = parseBody(type, data);
    var protocol = ENV_CONFIG.MMX.ssl === true ? https : http;
    var queryPath = path+((method === 'GET' || params.queryOnly) ? '?'+reqBody : '');
    queryPath = queryPath == '?' ? '' : queryPath;
    winston.verbose({
        host    : ENV_CONFIG.MMX.host,
        port    : ENV_CONFIG.MMX.port || (ENV_CONFIG.MMX.ssl === true ? 443 : 80),
        path    : queryPath,
        method  : method || 'GET',
        rejectUnauthorized : false,
        requestCert        : false,
        headers : {
            'Content-Type'   : type,
            'Content-Length' : reqBody.length,
            'Authorization'  : 'Basic ' + new Buffer(ENV_CONFIG.MMX.user + ':' + ENV_CONFIG.MMX.password).toString('base64')
        }
    });
    var call = protocol.request({
        host    : ENV_CONFIG.MMX.host,
        port    : ENV_CONFIG.MMX.port || (ENV_CONFIG.MMX.ssl === true ? 443 : 80),
        path    : queryPath,
        method  : method || 'GET',
        rejectUnauthorized : false,
        requestCert        : false,
        headers : {
            'Content-Type'   : type,
            'Content-Length' : reqBody.length,
            'Authorization'  : 'Basic ' + new Buffer(ENV_CONFIG.MMX.user + ':' + ENV_CONFIG.MMX.password).toString('base64')
        }
    }, function(res){
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            data += chunk;
        }).on('end', function(){
            try{
                data = JSON.parse(data);
            }catch(e){}
            if(!isSuccess(res.statusCode)) winston.error('MMXManager: failed to make remote call to '+ENV_CONFIG.MMX.host+' '+path+': code - '+res.statusCode+' error: '+data);
            if(typeof cb === typeof Function){
                if(isSuccess(res.statusCode))
                    cb(null, data);
                else
                    cb('failed-status', data);
            }
        });
    });
    call.on('error', function(e){
        winston.error('MMXManager: failed to make remote call to '+ENV_CONFIG.MMX.host+' '+path+': ',e);
        cb('request-error');
    });
    if(reqBody) call.write(reqBody, 'utf8');
    call.end();
};

// create an mmx app
MMXManager.prototype.createApp = function(userEmail, userMagnetId, body, cb){
    var me = this;
    if(!body) return cb('invalid-body');
    me.request('/plugins/mmxmgmt', 'GET', {
        command    : 'create',
        appName    : body.appName,
        appOwner   : userMagnetId,
        serverUser : userEmail,
        secret     : magnetId.v4()
    }, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully created mmx app: ' + body.appName+'('+data.appId+')');
        cb(null, filterResponse(data));
    });
};

// get all the mmx apps for the given user
MMXManager.prototype.getApps = function(userMagnetId, cb){
    var me = this;
    me.request('/plugins/mmxmgmt', 'GET', {
        command  : 'read',
        appOwner : userMagnetId
    }, function(e, data){
        if(e) return cb(e);
        data = (data && data.appList) ? data.appList : [];
        for(var i=0;i<data.length;++i){
            data[i] = filterResponse(data[i]);
        }
        cb(null, data);
    });
};

// get statistics for all mmx apps
MMXManager.prototype.getStats = function(uid, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/stats/app', 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, multipleStats);
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
    if(body.appName) req.appName = body.appName;
    if(body.googleApiKey) req.googleApiKey = body.googleApiKey;
    if(body.googleProjectId) req.googleProjectId = body.googleProjectId;
    me.request('/plugins/mmxmgmt', 'GET', req, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully updated mmx app: ' + mmxId);
        cb(null, data);
    });
};

// delete an mmx app
MMXManager.prototype.deleteApp = function(userMagnetId, isAdmin, mmxId, cb){
    var me = this;
    me.request('/plugins/mmxmgmt', 'GET', {
        command  : 'delete',
        appId    : mmxId,
        appOwner : userMagnetId
    }, function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deleted mmx app: ' + mmxId);
        cb(null, data);
    });
};

// get all the mmx messages for the given app in the context of the current user
MMXManager.prototype.getAppMessages = function(uid, mmxId, query, cb){
    var me = this;
    query.appId = mmxId;
    if(!query.searchby){
        query.searchby = 'datesent';
        query.value = 0;
        query.value2 = 9999999999;
    }
    me.request('/plugins/mmxmgmt/messages', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get statistics for the given app
MMXManager.prototype.getAppStats = function(uid, mmxId, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/rest/v1/stats/app/'+mmxId, 'GET', '', function(e, data){
        if(e) return cb(e);
        cb(null, stats);
    });
};

// get all the users for the given app
MMXManager.prototype.getAppUsers = function(uid, mmxId, query, cb){
    var me = this;
//    return cb(null, users);
    query.appId = mmxId;
//    return cb(null, users);
    me.request('/plugins/mmxmgmt/users', 'GET', query, function(e, data){
        if(e) return cb(e);
        cb(null, data);
    });
};

// get all the mmx devices for the given user
MMXManager.prototype.getAppUserDevices = function(uid, mmxId, mmxUid, cb){
    var me = this;
//    return cb(null, devices);
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

// send a ping, notification, or message to a user or device
MMXManager.prototype.sendMessage = function(uid, mmxId, mmxUid, type, body, cb){
    var me = this;
    var sendType = (type == 'push' || type == 'notification' || type == 'message') ? type : null;
    // TODO: integrate mmx notification and message
    if(!sendType || sendType == 'notification' || sendType == 'message') return cb('invalid-send-type');
    me.request('/plugins/mmxmgmt/'+sendType, 'POST', {
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
    });
};

// get all the mmx app topics
MMXManager.prototype.getAppTopics = function(uid, mmxId, query, cb){
    var me = this;
    me.request('/plugins/mmxmgmt/devices', 'GET', {
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
    me.request('/plugins/mmxmgmt?topicid='+topicId, 'DELETE', '', function(e, data){
        if(e) return cb(e);
        winston.verbose('MMXManager: successfully deleted mmx app topic: ' + topicId);
        cb(null, data);
    });
};

var users = {
    "results": [
        {
            "userId": "newuser2309",
            "name": "New User",
            "email": "newuser@mmx.com",
            "creationDate": "2014-09-24T00:38:12Z",
            "modificationDate": "2014-09-24T00:38:12Z"
        },
        {
            "userId": "newuser",
            "name": "New User",
            "email": "newuser@mmx.com",
            "creationDate": "2014-09-16T22:25:37Z",
            "modificationDate": "2014-09-16T22:25:37Z"
        },
        {
            "userId": "magnet.way",
            "name": "magnet.way",
            "creationDate": "2014-09-22T18:12:28Z",
            "modificationDate": "2014-09-22T18:12:28Z"
        }
    ],
    "total": 3,
    "offset": 0,
    "size": 10
}

var devices = {
    "results": [
        {
            "id": 1,
            "ownerId": "blah2-148d334586a",
            "deviceId": "1399b38520170d08",
            "osType": "ANDROID",
            "tokenType": "GCM",
            "clientToken": "APA91bErDLM6ExQKu466Pt1v9UXyRKQ1ddCvaE8oNOePDZ7wyiMvzRO3HklUXgLkhmTeDDEXdij_rq9g_NCdfR92TuKF4LZGerIIuE2BcwHmymmrgka8UPzgW-nmMCwUOIKe1xkHQHaz_J47tXf9Ml0Vk3gU32SF6—in71NuCNHMmdvFNrVPD4",
            "name": "Nexus Tablet One",
            "appId": "i0sqlunda4q",
            "created": "2014-10-03T17:29:02Z",
            "status": "ACTIVE",
            "phoneNumber": "4087118000",
            "carrierInfo": "VERIZON"
        },{
            "id": 2,
            "ownerId": "blah2-148d334586a",
            "deviceId": "afw3faw3faw3faw3",
            "osType": "ANDROID",
            "tokenType": "GCM",
            "clientToken": "APA91bErDLM6ExQKu466Pt1v9UXyRKQ1ddCvaE8oNOePDZ7wyiMvzRO3HklUXgLkhmTeDDEXdij_rq9g_NCdfR92TuKF4LZGerIIuE2BcwHmymmrgka8UPzgW-nmMCwUOIKe1xkHQHaz_J47tXf9Ml0Vk3gU32SF6—in71NuCNHMmdvFNrVPD4",
            "name": "Nexus Tablet One",
            "appId": "i0sqlunda4q",
            "created": "2014-10-03T17:29:02Z",
            "status": "ACTIVE",
            "phoneNumber": "408411201",
            "carrierInfo": "ATT"
        },{
            "id": 3,
            "ownerId": "blah2-148d334586a",
            "deviceId": "dr5drm7dr57drs",
            "osType": "ANDROID",
            "tokenType": "GCM",
            "clientToken": "APA91bErDLM6ExQKu466Pt1v9UXyRKQ1ddCvaE8oNOePDZ7wyiMvzRO3HklUXgLkhmTeDDEXdij_rq9g_NCdfR92TuKF4LZGerIIuE2BcwHmymmrgka8UPzgW-nmMCwUOIKe1xkHQHaz_J47tXf9Ml0Vk3gU32SF6—in71NuCNHMmdvFNrVPD4",
            "name": "Nexus Tablet One",
            "appId": "i0sqlunda4q",
            "created": "2014-10-03T17:29:02Z",
            "status": "ACTIVE",
            "phoneNumber": "4089151410",
            "carrierInfo": "SPRINT"
        }
    ],
    "total": 3,
    "offset": 0,
    "size": 10
}

var stats = {
    "appId": "i14ahmuo1xn",
    "inAppMessagesStats": {
        "stats": [
            {
                "type": "CANCELLED",
                "count": 15
            },
            {
                "type": "DELIVERED",
                "count": 83
            },
            {
                "type": "DELIVERY_ATTEMPTED",
                "count": 11
            },
            {
                "type": "PENDING",
                "count": 343
            },
            {
                "type": "TIMEDOUT",
                "count": 51
            },
            {
                "type": "WAKEUP_REQUIRED",
                "count": 121
            },
            {
                "type": "WAKEUP_SENT",
                "count": 345
            }
        ]
    },
    "pushMessageStats": {
        "appId": "i14ahmuo1xn",
        "stats": [
            {
                "state": "ACKNOWLEDGED",
                "type": "CONSOLEPING",
                "count": 23
            },
            {
                "state": "PUSHED",
                "type": "CONSOLEPING",
                "count": 534
            },
            {
                "state": "ACKNOWLEDGED",
                "type": "PING",
                "count": 22
            },
            {
                "state": "PUSHED",
                "type": "PING",
                "count": 1235
            }
        ]
    },
    "deviceStats": {
        "numDevices": 91
    }
}

var multipleStats = [{
    "appId": "i14ahmuo1xn",
    "inAppMessagesStats": {
        "stats": [
            {
                "type": "CANCELLED",
                "count": 15
            },
            {
                "type": "DELIVERED",
                "count": 83
            },
            {
                "type": "DELIVERY_ATTEMPTED",
                "count": 11
            },
            {
                "type": "PENDING",
                "count": 343
            },
            {
                "type": "TIMEDOUT",
                "count": 51
            },
            {
                "type": "WAKEUP_REQUIRED",
                "count": 121
            },
            {
                "type": "WAKEUP_SENT",
                "count": 345
            }
        ]
    },
    "pushMessageStats": {
        "appId": "i14ahmuo1xn",
        "stats": [
            {
                "state": "ACKNOWLEDGED",
                "type": "CONSOLEPING",
                "count": 23
            },
            {
                "state": "PUSHED",
                "type": "CONSOLEPING",
                "count": 534
            },
            {
                "state": "ACKNOWLEDGED",
                "type": "PING",
                "count": 22
            },
            {
                "state": "PUSHED",
                "type": "PING",
                "count": 1235
            }
        ]
    },
    "deviceStats": {
        "numDevices": 91
    }
}, {
    "appId": "i1sfpss5cmw",
    "inAppMessagesStats": {
        "stats": [
            {
                "type": "CANCELLED",
                "count": 51
            },
            {
                "type": "DELIVERED",
                "count": 100
            },
            {
                "type": "DELIVERY_ATTEMPTED",
                "count": 44
            },
            {
                "type": "PENDING",
                "count": 71
            },
            {
                "type": "TIMEDOUT",
                "count": 12
            },
            {
                "type": "WAKEUP_REQUIRED",
                "count": 6
            },
            {
                "type": "WAKEUP_SENT",
                "count": 92
            }
        ]
    },
    "pushMessageStats": {
        "appId": "i1sfpss5cmw",
        "stats": [
            {
                "state": "ACKNOWLEDGED",
                "type": "CONSOLEPING",
                "count": 111
            },
            {
                "state": "PUSHED",
                "type": "CONSOLEPING",
                "count": 44
            },
            {
                "state": "ACKNOWLEDGED",
                "type": "PING",
                "count": 20
            },
            {
                "state": "PUSHED",
                "type": "PING",
                "count": 2922
            }
        ]
    },
    "deviceStats": {
        "numDevices": 241
    }
}, {
    "appId": "i1sfvc395de",
    "inAppMessagesStats": {
        "stats": [
            {
                "type": "CANCELLED",
                "count": 8181
            },
            {
                "type": "DELIVERED",
                "count": 323
            },
            {
                "type": "DELIVERY_ATTEMPTED",
                "count": 511
            },
            {
                "type": "PENDING",
                "count": 1515
            },
            {
                "type": "TIMEDOUT",
                "count": 43
            },
            {
                "type": "WAKEUP_REQUIRED",
                "count": 90
            },
            {
                "type": "WAKEUP_SENT",
                "count": 61
            }
        ]
    },
    "pushMessageStats": {
        "appId": "i1sfvc395de",
        "stats": [
            {
                "state": "ACKNOWLEDGED",
                "type": "CONSOLEPING",
                "count": 900
            },
            {
                "state": "PUSHED",
                "type": "CONSOLEPING",
                "count": 12
            },
            {
                "state": "ACKNOWLEDGED",
                "type": "PING",
                "count": 1224
            },
            {
                "state": "PUSHED",
                "type": "PING",
                "count": 616
            }
        ]
    },
    "deviceStats": {
        "numDevices": 8116
    }
}];

function filterResponse(data){
    data.gcm = data.gcm || {};
    return {
        id               : data.appId,
        magnetId         : data.appId,
        googleApiKey     : data.gcm.googleApiKey,
        googleProjectId  : data.gcm.googleProjectId,
        appName          : data.appName,
        apiKey           : data.apiKey,
        creationDate     : data.creationDate,
        modificationDate : data.modificationDate
    }
}

function filterUsersResponse(data){
    return {
        id               : data.appId,
        magnetId         : data.appId,
        appName          : data.appName,
        apiKey           : data.apiKey,
        creationDate     : data.creationDate,
        modificationDate : data.modificationDate
    }
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
function createAcceptHeader(dataType){
    var str = '';
    dataType = dataType || 'json';
    switch(dataType){
        case 'xml'  : str = 'application/xml;q=1.0'; break;
        case 'html' : str = 'text/plain;q=1.0'; break;
        case 'text' : str = 'text/plain;q=1.0'; break;
        case 'json' : str = 'application/json;q=1.0'; break;
        default     : str = '*/*;q=1.0'; break;
    }
    return str;
}

module.exports = new MMXManager();