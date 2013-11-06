var http = require('http')
, https = require('https')
, orm = require('./orm')
, magnetId = require('node-uuid')
, xml2js = require('xml2js')
, urlParser = require('url');

var WebServiceManager = function(){
    return this;
};

WebServiceManager.prototype.getWebService = function(url, callback){
    var me = this;
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
};

WebServiceManager.prototype.request = function(url, callback){
    var me = this;
    var reqObj = urlParser.parse(url);
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
        winston.error('WebServiceManager: failed to make remote call to '+reqObj.hostname+': ',e);
        callback('request-error');
    });
};

WebServiceManager.prototype.parse = function(str, callback){
    var parser = new xml2js.Parser();
    if(str.indexOf('<?xml ') != -1 || str.indexOf('<application ') != -1 || str.indexOf('<definitions ') != -1){
        parser.parseString(str, function(e, json){
            if(e){
                winston.error('WebServiceManager: error parsing web service file: ',e);
                callback('error-parsing-webservice');
            }else{
                callback(null, json);
            }
        });
    }else{
        winston.error('WebServiceManager: error parsing WSDL: not a valid XML file');
        callback('invalid-xml');
    }
};

WebServiceManager.prototype.getWADLResourcePath = function(json){
    try{
        var obj = false;
        for(var prop in json){
            if(prop.indexOf('application') != -1){
                for(var attr in json[prop]){
                    if(attr.indexOf('resources') != -1){
                        obj = json[prop][attr];
                    }
                }
            }
        }
        return obj ? obj[0]['$']['base'] : false;
    }catch(e){
        return false;
    }
};

WebServiceManager.prototype.getServiceName = function(json){
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
        return false;
    }
};

WebServiceManager.prototype.saveWebService = function(url, callback){
    var me = this;
    if(url && url.trim() != ''){
        url = (url.indexOf('http://') == -1 && url.indexOf('https://') == -1) ? 'http://'+url : url;
        var wsdlObj = {
            magnetId    : magnetId.v1(),
            url         : url,
            serviceName : 'WSDL'+new Date().getTime(),
            bindStyle   : 'ws'
        };
        me.getWebService(url, function(e, json, output){
            if(e){
                callback(e);
            }else{
                var invalid = false;
                if(json.application){
                    var wsdlResourcePath = me.getWADLResourcePath(json);
                    if(wsdlResourcePath){
                        var pathObj = urlParser.parse(wsdlResourcePath);
                        wsdlObj.serviceName = pathObj.hostname;
                        wsdlObj.bindStyle = 'rs';
                    }else{
                        invalid = true;
                    }
                }else{
                    var serviceName = me.getServiceName(json);
                    if(serviceName){
                        wsdlObj.serviceName = serviceName !== false ? serviceName : wsdlObj.serviceName;
                        wsdlObj.bindStyle = output.indexOf('style="rpc"') != -1 ? 'rpc' : 'ws';
                    }else{
                        invalid = true;
                    }
                }
                if(invalid == false){
                    me.create(wsdlObj, function(e, wsdl){
                        if(e){
                            callback(e);
                        }else{
                            callback(null, wsdl);
                        }
                    });
                }else{
                    callback('invalid-webservice');
                }
            }
        });
    }else{
        winston.error('WebServiceManager: failed to make remote call due to invalid url: '+url);
        callback('invalid-url');
    }
};

WebServiceManager.prototype.create = function(wsdlObj, callback){
    var me = this;
    orm.model('WSDL').create(wsdlObj).success(function(wsdl){
        callback(null, wsdl);
    }).error(function(e){
        winston.error('WebServiceManager: error creating WSDL: ',e);
        callback('error-creating-wsdl');
    });
};

module.exports = new WebServiceManager();