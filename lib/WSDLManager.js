var http = require('http')
, https = require('https')
, orm = require('./orm')
, magnetId = require('node-uuid')
, xml2js = require('xml2js');

var WSDLManager = function(){
    return this;
};

WSDLManager.prototype.getWSDL = function(url, callback){
    var me = this;
    if(url && (url.indexOf('http://') != -1 || url.indexOf('https://') != -1)){
        me.request(url, function(e, data){
            if(e){
                callback(e);
            }else{
                me.parse(data, function(e, json){
                    if(e){
                        callback(e);
                    }else{
                        callback(null, json, data);
                    }
                });
            }
        });
    }else{
        console.error('WSDLManager: failed to make remote call due to invalid url: '+url);
        callback('invalid-url');
    }
};

WSDLManager.prototype.request = function(url, callback){
    var me = this;
    var reqObj = require('url').parse(url);
    var protocol = reqObj.protocol == 'https:' ? https : http;
    protocol.get({
        host : reqObj.hostname,
        port : reqObj.port || (reqObj.protocol == 'https:' ? 443 : 80),
        path : reqObj.path
    }, function(res){
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            data += chunk;
        }).on('end',function(){
            callback(null, data);
        });
    }).on('error', function(e){
        console.error('WSDLManager: failed to make remote call to '+reqObj.hostname+': ',e);
        callback('request-error');
    });
};

WSDLManager.prototype.parse = function(str, callback){
    var parser = new xml2js.Parser();
    if(str.substr(0, 20).indexOf('<?xml ') != -1){
        parser.parseString(str, function (e, json){
            if(e){
                console.error('WSDLManager: error parsing WSDL: ',e);
                callback('error-parsing-wsdl');
            }else{
                callback(null, json);
            }
        });
    }else{
        console.error('WSDLManager: error parsing WSDL: not a valid XML file');
        callback('invalid-xml');
    }
};

WSDLManager.prototype.getServiceName = function(json){
    try{
        var obj = false;
        for(var prop in json){
            if(prop.indexOf('definitions') != -1){
                for(var attr in json[prop]){
                    if(attr.indexOf('service') != -1){
                        obj = json[prop][attr];
                    }
                }
            }
        }
        return obj ? obj[0]['$']['name'] : false;
    }catch(e){
        console.error('WSDLManager: error obtaining service name: ',e);
        return false;
    }
};

WSDLManager.prototype.saveWSDL = function(url, callback){
    var me = this, wsdlObj = {
        magnetId    : magnetId.v1(),
        url         : url,
        serviceName : 'WSDL'+new Date().getTime(),
        bindStyle   : 'ws'
    };
    me.getWSDL(url, function(e, json, output){
        if(e){
            me.create(wsdlObj, function(e, wsdl){
                if(e){
                    callback(e);
                }else{
                    callback(null, wsdl);
                }
            });
        }else{
            var serviceName = me.getServiceName(json);
            wsdlObj.serviceName = serviceName !== false ? serviceName : wsdlObj.serviceName;
            wsdlObj.bindStyle = output.indexOf('style="rpc"') != -1 ? 'rpc' : 'ws';
            me.create(wsdlObj, function(e, wsdl){
                if(e){
                    callback(e);
                }else{
                    callback(null, wsdl);
                }
            });
        }
    });
};

WSDLManager.prototype.create = function(wsdlObj, callback){
    var me = this;
    orm.model('WSDL').create(wsdlObj).success(function(wsdl){
        callback(null, wsdl);
    }).error(function(e){
        console.error('WSDLManager: error creating WSDL: ',e);
        callback('error-creating-wsdl');
    });
};

module.exports = new WSDLManager();