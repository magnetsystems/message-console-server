var http = require('follow-redirects').http
, https = require('follow-redirects').https
, MMXManager = require('./MMXManager')
, _ = require('underscore')
, magnetId = require('node-uuid');

var WPOAuthClient = function(){};

WPOAuthClient.prototype.getAuthCodeUrl = function(){
    return (ENV_CONFIG.WPOAuth.ssl ? 'https://' : 'http://') + ENV_CONFIG.WPOAuth.host + (ENV_CONFIG.WPOAuth.port ? (':'+ENV_CONFIG.WPOAuth.port) : '') + '/oauth/authorize' +
        '?response_type=code&client_id=' + ENV_CONFIG.WPOAuth.clientId +
        '&redirect_uri=' + encodeURIComponent(ENV_CONFIG.App.appUrl + '/oauth-login');
};

WPOAuthClient.prototype.getAccessToken = function(user, code, cb) {
    if(!code) return cb('invalid-code');
    var me = this;
    me.request('POST', '/oauth/token', 'grant_type=authorization_code&client_id=' + ENV_CONFIG.WPOAuth.clientId+'&client_secret=' + ENV_CONFIG.WPOAuth.clientSecret+'&code='+code+'&redirect_uri='+encodeURIComponent(ENV_CONFIG.App.appUrl + '/oauth-login'), function(e, oauthSession){
        if(e) return cb(e);
        me.getUserInfo(user, oauthSession.access_token, function(e, fullUser){
            if(e) return cb(e);
            cb(null, fullUser);
        });
    });
};

WPOAuthClient.prototype.typeMap = function(capability){
    capability = capability || {};
    if(capability.customer || capability.magnetemployee || capability.developer || capability.builder)
        return 'developer';
    if(capability.administrator)
        return 'admin';
    //if(capability.subscriber)
    return 'developer';
};

WPOAuthClient.prototype.getUserInfo = function(user, access_token, cb) {
    var me = this;
    if(!access_token) return cb('invalid-token');
    me.request('GET', '/users/me/profile?access_token='+access_token, null, function(e, data){
        if(e) return cb(e);
        user.email = data.user_email;
        user.magnetId = data.user_email;
        user.userType = me.typeMap(data.wp_capabilities);
        user.hasMMXApp = true;
        user.activated = true;
        var name = data.display_name.split(' ');
        if(name.length > 0){
            user.firstName = name[0];
        }
        name.shift();
        if(name.length > 0){
            user.lastName = name.join(' ');
        }
        cb(null, user);
    });
};

WPOAuthClient.prototype.request = function(method, path, data, cb){
    var protocol = ENV_CONFIG.WPOAuth.ssl === true ? https : http;
    var req = {
        host               : ENV_CONFIG.WPOAuth.host,
        port               : ENV_CONFIG.WPOAuth.port || (ENV_CONFIG.WPOAuth.ssl === true ? 443 : 80),
        path               : path,
        method             : method,
        rejectUnauthorized : false,
        requestCert        : false,
        headers : {
            'Content-Length' : data ? Buffer.byteLength(data, 'utf8') : 0,
            'Content-Type'   : 'application/x-www-form-urlencoded'
        }
    };
    winston.silly('OAuth: remote call - ', req);
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
                winston.verbose('OAuth: failed to make remote call to '+req.host+':'+req.port+req.path+': code - '+res.statusCode+' response: ', data);
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
        winston.verbose('OAuth: failed to make remote call to '+req.host+':'+req.port+req.path+': ', e, res||'', body||'');
        cb('connect-error', e, 400);
    });
    if(data) call.write(data, 'utf8');
    call.end();
};

function isSuccess(code){
    return code >= 200 && code <= 299;
}

module.exports = new WPOAuthClient();
