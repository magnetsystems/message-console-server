var ProjectManager = require('../lib/ProjectManager')
, UserManager = require('../lib/UserManager')
, WebServiceManager = require('../lib/WebServiceManager')
, fs = require('fs')
, magnetId = require('node-uuid')
, orm = require('../lib/orm')
, xml2js = require('xml2js');

jasmine.getEnv().defaultTimeoutInterval = 30000;

var testProject, testUser, _user, _project, testWSDL, _wsdl;

describe('WebServiceManager database setup', function(){

    _user = {
        firstName   : 'Pyramid',
        lastName    : 'Hefeweizen',
        email       : 'demouser@magnet.com',
        userType    : 'developer',
        password    : 'wheatale',
        companyName : 'beer'
    };
    _project = {
        name        : 'test project name',
        description : 'test project description',
        version     : '1.0'
    }
    _wsdl = {
        url : 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl'
    }

    beforeAll(function(done){
        orm.setup('./lib/models', function(){
            UserManager.create(_user, function(e, user){
                _user = user;
                expect(user).not.toBeUndefined();
                ProjectManager.create(_user.magnetId, _project, function(e, project){
                    _project.magnetId = project.magnetId;
                    expect(magnetId).not.toBeUndefined();
                    ProjectManager.addWebServiceURL(_project.magnetId, _user.id, _wsdl.url, function(e, wsdl){
                        _wsdl = wsdl;
                        expect(wsdl).not.toBeUndefined();
                        done();
                    });
                });
            });
        });
    });

});

describe('WebServiceManager getWebService', function(){

    it('should fail if url is invalid', function(done){
        WebServiceManager.getWebService('', function(e){
            expect(e).toEqual('request-error');
            done();
        });
    });

    it('should fail if url does not have http:// prefix', function(done){
        WebServiceManager.getWebService('ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl', function(e){
            expect(e).toEqual('request-error');
            done();
        });
    });

    it('should not return an error if the WSDL at the given url exists', function(done){
        WebServiceManager.getWebService(_wsdl.url, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a json object containing the correct service name if the WSDL at the given url exists', function(done){
        WebServiceManager.getWebService(_wsdl.url, function(e, json){
            expect(WebServiceManager.getServiceName(json)).toEqual('YellowPagesService');
            done();
        });
    });

});

describe('WebServiceManager request', function(){

    it('should fail if url is invalid', function(done){
        WebServiceManager.request('', function(e){
            expect(e).toEqual('request-error');
            done();
        });
    });

    it('should fail if url does not have http:// prefix', function(done){
        WebServiceManager.request('ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl', function(e){
            expect(e).toEqual('request-error');
            done();
        });
    });

    it('should not return an error if the WSDL at the given url exists', function(done){
        WebServiceManager.request(_wsdl.url, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a json object containing the correct service name if the WSDL at the given url exists', function(done){
        WebServiceManager.request(_wsdl.url, function(e, data){
            expect(data).toContain('<binding name="YellowPagesPortTypePortBinding" type="tns:YellowPagesPortType">');
            done();
        });
    });

});

describe('WebServiceManager parse', function(){
    var invalidStr = '<html>html content</html>';
    var invalidXML = "<?xml version='1.0' encoding='UTF-8'?></xml>";
    var validXML = "<?xml version='1.0' encoding='UTF-8' ?><definitions>works</definitions>";

    it('should fail if string is empty', function(done){
        WebServiceManager.parse('', function(e){
            expect(e).toEqual('invalid-xml');
            done();
        });
    });

    it('should fail if string does not contain a definitions tag', function(done){
        WebServiceManager.parse(invalidStr, function(e){
            expect(e).toEqual('invalid-xml');
            done();
        });
    });

    it('should fail if string could not be completely parsed', function(done){
        WebServiceManager.parse(invalidXML, function(e){
            expect(e).toEqual('error-parsing-webservice');
            done();
        });
    });

    it('should parse xml string into json given valid input', function(done){
        WebServiceManager.parse(validXML, function(e, json){
            expect(json.definitions).toEqual('works');
            done();
        });
    });

});

describe('WebServiceManager getServiceName', function(){
    var yellowPagesJSON = {"definitions":{"$":{"xmlns:wsu":"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd","xmlns:wsp":"http://www.w3.org/ns/ws-policy","xmlns:wsp1_2":"http://schemas.xmlsoap.org/ws/2004/09/policy","xmlns:wsam":"http://www.w3.org/2007/05/addressing/metadata","xmlns:soap":"http://schemas.xmlsoap.org/wsdl/soap/","xmlns:tns":"http://www.magnet.com","xmlns:xsd":"http://www.w3.org/2001/XMLSchema","xmlns":"http://schemas.xmlsoap.org/wsdl/","targetNamespace":"http://www.magnet.com","name":"YellowPagesService"},"types":[{"xsd:schema":[{"xsd:import":[{"$":{"namespace":"http://www.magnet.com","schemaLocation":"http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?xsd=1"}}]},{"xsd:import":[{"$":{"namespace":"http://www.magnet.com/yp","schemaLocation":"http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?xsd=2"}}]}]}],"message":[{"$":{"name":"findAll"},"part":[{"$":{"name":"findAll","element":"tns:findAll"}}]},{"$":{"name":"findAllResponse"},"part":[{"$":{"xmlns:ns1":"http://www.magnet.com/yp","name":"FindResponseList","element":"ns1:FindResponseList"}}]},{"$":{"name":"Exception"},"part":[{"$":{"name":"fault","element":"tns:Exception"}}]},{"$":{"name":"getImage"},"part":[{"$":{"name":"getImage","element":"tns:getImage"}}]},{"$":{"name":"getImageResponse"},"part":[{"$":{"xmlns:ns2":"http://www.magnet.com/yp","name":"ImageByteArray","element":"ns2:ImageByteArray"}}]},{"$":{"name":"find"},"part":[{"$":{"name":"find","element":"tns:find"}}]},{"$":{"name":"findResponse"},"part":[{"$":{"xmlns:ns3":"http://www.magnet.com/yp","name":"FindResponse","element":"ns3:FindResponse"}}]},{"$":{"name":"list"}},{"$":{"name":"listResponse"},"part":[{"$":{"xmlns:ns4":"http://www.magnet.com/yp","name":"FindResponseList","element":"ns4:FindResponseList"}}]},{"$":{"name":"match"},"part":[{"$":{"name":"match","element":"tns:match"}}]},{"$":{"name":"matchResponse"},"part":[{"$":{"xmlns:ns5":"http://www.magnet.com/yp","name":"FindResponseMatchList","element":"ns5:FindResponseMatchList"}}]}],"portType":[{"$":{"name":"YellowPagesPortType"},"operation":[{"$":{"name":"findAll"},"input":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/findAllRequest","message":"tns:findAll"}}],"output":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/findAllResponse","message":"tns:findAllResponse"}}],"fault":[{"$":{"message":"tns:Exception","name":"Exception","wsam:Action":"http://www.magnet.com/YellowPagesPortType/findAll/Fault/Exception"}}]},{"$":{"name":"getImage"},"input":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/getImageRequest","message":"tns:getImage"}}],"output":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/getImageResponse","message":"tns:getImageResponse"}}],"fault":[{"$":{"message":"tns:Exception","name":"Exception","wsam:Action":"http://www.magnet.com/YellowPagesPortType/getImage/Fault/Exception"}}]},{"$":{"name":"find"},"input":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/findRequest","message":"tns:find"}}],"output":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/findResponse","message":"tns:findResponse"}}],"fault":[{"$":{"message":"tns:Exception","name":"Exception","wsam:Action":"http://www.magnet.com/YellowPagesPortType/find/Fault/Exception"}}]},{"$":{"name":"list"},"input":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/listRequest","message":"tns:list"}}],"output":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/listResponse","message":"tns:listResponse"}}],"fault":[{"$":{"message":"tns:Exception","name":"Exception","wsam:Action":"http://www.magnet.com/YellowPagesPortType/list/Fault/Exception"}}]},{"$":{"name":"match"},"input":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/matchRequest","message":"tns:match"}}],"output":[{"$":{"wsam:Action":"http://www.magnet.com/YellowPagesPortType/matchResponse","message":"tns:matchResponse"}}],"fault":[{"$":{"message":"tns:Exception","name":"Exception","wsam:Action":"http://www.magnet.com/YellowPagesPortType/match/Fault/Exception"}}]}]}],"binding":[{"$":{"name":"YellowPagesPortTypePortBinding","type":"tns:YellowPagesPortType"},"soap:binding":[{"$":{"transport":"http://schemas.xmlsoap.org/soap/http","style":"document"}}],"operation":[{"$":{"name":"findAll"},"soap:operation":[{"$":{"soapAction":""}}],"input":[{"soap:body":[{"$":{"use":"literal"}}]}],"output":[{"soap:body":[{"$":{"use":"literal"}}]}],"fault":[{"$":{"name":"Exception"},"soap:fault":[{"$":{"name":"Exception","use":"literal"}}]}]},{"$":{"name":"getImage"},"soap:operation":[{"$":{"soapAction":""}}],"input":[{"soap:body":[{"$":{"use":"literal"}}]}],"output":[{"soap:body":[{"$":{"use":"literal"}}]}],"fault":[{"$":{"name":"Exception"},"soap:fault":[{"$":{"name":"Exception","use":"literal"}}]}]},{"$":{"name":"find"},"soap:operation":[{"$":{"soapAction":""}}],"input":[{"soap:body":[{"$":{"use":"literal"}}]}],"output":[{"soap:body":[{"$":{"use":"literal"}}]}],"fault":[{"$":{"name":"Exception"},"soap:fault":[{"$":{"name":"Exception","use":"literal"}}]}]},{"$":{"name":"list"},"soap:operation":[{"$":{"soapAction":""}}],"input":[{"soap:body":[{"$":{"use":"literal"}}]}],"output":[{"soap:body":[{"$":{"use":"literal"}}]}],"fault":[{"$":{"name":"Exception"},"soap:fault":[{"$":{"name":"Exception","use":"literal"}}]}]},{"$":{"name":"match"},"soap:operation":[{"$":{"soapAction":""}}],"input":[{"soap:body":[{"$":{"use":"literal"}}]}],"output":[{"soap:body":[{"$":{"use":"literal"}}]}],"fault":[{"$":{"name":"Exception"},"soap:fault":[{"$":{"name":"Exception","use":"literal"}}]}]}]}],"service":[{"$":{"name":"YellowPagesService"},"port":[{"$":{"name":"YellowPagesPortTypePort","binding":"tns:YellowPagesPortTypePortBinding"},"soap:address":[{"$":{"location":"http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService"}}]}]}]}};
    var invalidWSDLJSON = {
        "definitions" : {
            "service" : "Mackerel"
        }
    };
    var invalid = {};

    it('should return false if input is an empty string', function(done){
        expect(WebServiceManager.getServiceName('')).toEqual(false);
        done();
    });

    it('should return false if input is not defined', function(done){
        expect(WebServiceManager.getServiceName(invalid.input)).toEqual(false);
        done();
    });
    it('should fail if json object does not have valid WSDL object structure', function(done){
        expect(WebServiceManager.getServiceName(invalidWSDLJSON)).toEqual(false);
        done();
    });

    it('should return service name is JSON object is completely parsed and the service name exists', function(done){
        expect(WebServiceManager.getServiceName(yellowPagesJSON)).toEqual('YellowPagesService');
        done();
    });

    var wsdlPath = 'data/wsdls';
    it('should parse many wsdls and obtain service name', function(done){
        var files = fs.readdirSync(wsdlPath);
        var total = files.length, ctr = 0;
        files.forEach(function(filename){
            if(filename.indexOf('.xml') == -1){
                ++ctr;
                if(ctr == total) done();
            }else{
                fs.readFile(wsdlPath+'/'+filename, 'utf8', function(e, data){
                    if(e) throw e;
                    WebServiceManager.parse(data, function(e, json){
                        if(e){
                            expect(e).toBeNull();
                            console.error(ctr+'\t'+filename + '\terror parsing');
                        }else{
                            var serviceName = WebServiceManager.getServiceName(json);
                            expect(serviceName).not.toEqual(false);
                            console.log(ctr+'\t'+filename + '\t' + serviceName);
                        }
                        ++ctr;
                        if(ctr == total) done();
                    });
                });
            }
        });
    });

});

describe('WebServiceManager saveWebService', function(){
    var urls = {
        urlNoHTTP : 'ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl',
        valid     : 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl'
    };

    it('should fail if url string is empty', function(done){
        WebServiceManager.saveWebService('', function(e){
            expect(e).toEqual('invalid-url');
            done();
        });
    });

    it('should fail if url string is not defined', function(done){
        WebServiceManager.saveWebService(urls.input, function(e){
            expect(e).toEqual('invalid-url');
            done();
        });
    });

    it('should parse and persist wsdl given a valid url', function(done){
        WebServiceManager.saveWebService(urls.valid, function(e, wsdl){
            expect(wsdl.url).toEqual('http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl');
            expect(wsdl.serviceName).toEqual('YellowPagesService');
            expect(wsdl.bindStyle).toEqual('ws');
            done();
        });
    });

    it('should store and append http:// to url if url does not contain http:// or https:// prefix', function(done){
        WebServiceManager.saveWebService(urls.urlNoHTTP, function(e, wsdl){
            expect(wsdl.url).toEqual('http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl');
            done();
        });
    });

});

describe('WebServiceManager create', function(){
    var invalidURL = {
        serviceName : 'YellowPagesService',
        bindStyle   : 'ws',
        url         : 'invalid-url',
        magnetId    : magnetId.v1()
    };
    var invalidMagnetId = {
        serviceName : 'YellowPagesService',
        bindStyle   : 'ws',
        url         : 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl',
        magnetId    : 'invalid-magnet-id'
    };
    var valid = {
        serviceName : 'YellowPagesService',
        bindStyle   : 'ws',
        url         : 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl',
        magnetId    : magnetId.v1()
    };

    it('should fail given an undefined variable', function(done){
        WebServiceManager.create(invalidURL.input, function(e){
            expect(e).toEqual('error-creating-wsdl');
            done();
        });
    });

    it('should fail given an empty object', function(done){
        WebServiceManager.create({}, function(e){
            expect(e).toEqual('error-creating-wsdl');
            done();
        });
    });

    it('should fail given an invalid magnet id', function(done){
        WebServiceManager.create(invalidMagnetId, function(e){
            expect(e).toEqual('error-creating-wsdl');
            done();
        });
    });

    it('should fail given an invalid url', function(done){
        WebServiceManager.create(invalidURL, function(e){
            expect(e).toEqual('error-creating-wsdl');
            done();
        });
    });

    it('should create wsdl and return wsdl model given a valid wsdl object', function(done){
        WebServiceManager.create(valid, function(e, wsdl){
            expect(wsdl.url).toEqual('http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl');
            expect(wsdl.serviceName).toEqual('YellowPagesService');
            expect(wsdl.bindStyle).toEqual('ws');
            done();
        });
    });

});

describe('WebServiceManager getWADLResourcePath', function(){
    var wadlPath = 'data/wadls';
    var urlParser = require('url');

    it('should parse many wadls and obtain resource paths', function(done){
        var files = fs.readdirSync(wadlPath);
        var total = files.length, ctr = 0;
        files.forEach(function(filename){
            if(filename.indexOf('.xml') == -1){
                ++ctr;
                if(ctr == total) done();
            }else{
                fs.readFile(wadlPath+'/'+filename, 'utf8', function(e, data){
                    if(e) throw e;
                    WebServiceManager.parse(data, function(e, json){
                        var resPath = WebServiceManager.getWADLResourcePath(json);
                        if(e || resPath === false){
                            expect(e).toBeNull();
                            console.error(ctr+'\t'+filename + '\terror parsing');
                        }else{
                            var wsObj = urlParser.parse(resPath);
                            expect(resPath).toContain('http');
                            expect(wsObj.hostname).not.toBeUndefined();
                            console.log(ctr+'\t'+filename + '\t' + resPath + '\t'+wsObj.hostname);
                        }
                        ++ctr;
                        if(ctr == total) done();
                    });
                });
            }
        });
    });

});
