var ProjectManager = require('../lib/ProjectManager')
, UserManager = require('../lib/UserManager')
, WSDLManager = require('../lib/WSDLManager')
, fs = require('fs')
, magnetId = require('node-uuid')
, orm = require('../lib/orm');

jasmine.getEnv().defaultTimeoutInterval = 30000;

var testProject, testUser, _user, _project, testWSDL, _wsdl;

describe('WSDLManager database setup', function(){

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
                ProjectManager.create(_user.magnetId, _project, function(e, magnetId){
                    _project.magnetId = magnetId;
                    expect(magnetId).not.toBeUndefined();
                    ProjectManager.addWSDLUrl(_project.magnetId, _user.id, _wsdl.url, function(e, wsdl){
                        _wsdl = wsdl;
                        expect(wsdl).not.toBeUndefined();
                        done();
                    });
                });
            });
        });
    });

});


describe('WSDLManager getWSDL', function(){

    beforeEach(function(){
        testUser = _user;
        testProject = {
            name        : 'test project name',
            description : 'test project description',
            version     : '1.0'
        }
    });

    it('should fail if url is invalid', function(done){
        WSDLManager.getWSDL('', function(e){
            expect(e).toEqual('request-error');
            done();
        });
    });

    it('should fail if url does not have http:// prefix', function(done){
        WSDLManager.getWSDL('ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl', function(e){
            expect(e).toEqual('request-error');
            done();
        });
    });

    it('should not return an error if the WSDL at the given url exists', function(done){
        WSDLManager.getWSDL(_wsdl.url, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a json object containing the correct service name if the WSDL at the given url exists', function(done){
        WSDLManager.getWSDL(_wsdl.url, function(e, json){
            expect(WSDLManager.getServiceName(json)).toEqual('YellowPagesService');
            done();
        });
    });

});
