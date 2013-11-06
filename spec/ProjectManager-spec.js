var ProjectManager = require('../lib/ProjectManager')
, UserManager = require('../lib/UserManager')
, fs = require('fs')
, magnetId = require('node-uuid')
, orm = require('../lib/orm');

jasmine.getEnv().defaultTimeoutInterval = 30000;

var testProject, testUser, _user, _project, testWSDL, _wsdl;

describe('ProjectManager database setup', function(){

    _user = {
        firstName   : 'Pyramid',
        lastName    : 'Hefeweizen',
        email       : 'demouser@magnet.com',
        userType    : 'developer',
        password    : 'wheatale',
        companyName : 'beer'
    };

    beforeAll(function(done){
        orm.setup('./lib/models', function(){
            UserManager.create(_user, function(e, user){
                _user = user;
                expect(user).not.toBeUndefined();
                done();
            });
        });
    });

});

describe('ProjectManager create', function(){

    beforeEach(function(){
        testUser = _user;
        testProject = {
            name        : 'test project name',
            description : 'test project description',
            version     : '1.0',
            jdbcPort    : '3306',
            smtpPort    : 587
        }
    });

    it('should fail if user magnetId is invalid', function(done){
        ProjectManager.create('', testProject, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should fail if project is missing', function(done){
        ProjectManager.create(testUser.magnetId, null, function(e){
            expect(e).toEqual('invalid-body');
            done();
        });
    });

    it('should fail if project name is missing', function(done){
        delete testProject.name;
        ProjectManager.create(testUser.magnetId, testProject, function(e){
            expect(e).toEqual('invalid-body');
            done();
        });
    });

    it('should fail if project description is missing', function(done){
        delete testProject.description;
        ProjectManager.create(testUser.magnetId, testProject, function(e){
            expect(e).toEqual('invalid-body');
            done();
        });
    });

    it('should succeed if data is valid', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, project){
            _project = testProject;
            _project.magnetId = project.magnetId;
            _project.UserId = project.UserId;
            expect(e).toBeNull();
            done();
        });
    });

});

describe('ProjectManager read', function(){

    beforeEach(function(){
        testUser = _user;
        testProject = _project;
    });

    it('should fail if there is no project with the given magnetId', function(done){
        ProjectManager.read('', function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should succeed if a project with the given magnetId exists', function(done){
        ProjectManager.read(testProject.magnetId, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return correct data if a project with the given magnetId exists', function(done){
        ProjectManager.read(testProject.magnetId, function(e, project){
            expect(project.magnetId).toEqual(_project.magnetId);
            expect(project.name).toEqual(_project.name);
            expect(project.description).toEqual(_project.description);
            expect(project.version).toEqual(_project.version);
            done();
        });
    });

});

describe('ProjectManager update', function(){

    var modifiedTestProject;

    beforeEach(function(){
        testUser = _user;
        testProject = _project;
        modifiedTestProject = {
            name        : 'modified test project name',
            description : 'modified test project description',
            version     : '2.0',
            magnetId    : 'new magnetId',
            jdbcPort    : 3306,
            smtpPort    : 587
        }
    });

    it('should fail if a project with the given magnetId was not found', function(done){
        ProjectManager.update('', testUser.id, modifiedTestProject, function(e, project){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should fail if the user with the given id does not own the project', function(done){
        ProjectManager.update(testProject.magnetId, '', modifiedTestProject, function(e, project){
            expect(e).toEqual('project-not-authorized');
            done();
        });
    });

    it('should fail if data is invalid', function(done){
        ProjectManager.update(testProject.magnetId, testUser.id, null, function(e){
            expect(e).toEqual('invalid-body');
            done();
        });
    });

    it('should succeed if data is valid', function(done){
        ProjectManager.update(testProject.magnetId, testUser.id, modifiedTestProject, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should not modify the project magnetId if the magnetId is passed in the body', function(done){
        ProjectManager.update(testProject.magnetId, testUser.id, modifiedTestProject, function(e, project){
            expect(project.magnetId).toEqual(testProject.magnetId);
            done();
        });
    });

    it('should return correct data if the update succeeded', function(done){
        ProjectManager.update(testProject.magnetId, testUser.id, modifiedTestProject, function(e, project){
            expect(project.magnetId).toEqual(testProject.magnetId);
            expect(project.name).toEqual(modifiedTestProject.name);
            expect(project.description).toEqual(modifiedTestProject.description);
            expect(project.version).toEqual(modifiedTestProject.version);
            done();
        });
    });

});

describe('ProjectManager getConfig', function(){

    beforeEach(function(){
        testProject = _project;
    });

    it('should fail if a project with the given magnetId was not found', function(done){
        ProjectManager.getConfig('', function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should succeed if a project with the given magnetId exists', function(done){
        ProjectManager.getConfig(testProject.magnetId, function(e){
            expect(e).toBeNull();
            done();
        });
    });
    it('should set configFileStale to false if config file is generated', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, project){
            expect(project.configFileStale).toEqual(true);
            ProjectManager.getConfig(project.magnetId, function(e, filePath){
                expect(filePath).not.toBeUndefined();
                ProjectManager.read(project.magnetId, function(e, newproject){
                    expect(newproject.configFileStale).toEqual(false);
                    done();
                });
            });
        });
    });

    it('should create config zip file in file system if the given magnetId exists', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, project){
            expect(project.configFileStale).toEqual(true);
            ProjectManager.getConfig(project.magnetId, function(e, filePath){
                expect(filePath).not.toBeUndefined();
                fs.readFile(filePath, 'ascii', function(e, file){
                    expect(file).not.toBeUndefined();
                    done();
                });
            });
        });
    });

    it('should succeed if a project with the given magnetId exists even if the user folder has been deleted', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, project){
            expect(project.configFileStale).toEqual(true);
            ProjectManager.getConfig(project.magnetId, function(e, filePath){
                expect(filePath).not.toBeUndefined();
                fs.unlink(filePath, function(e){
                    fs.readFile(filePath, 'ascii', function(e){
                        expect(e).not.toBeNull();
                        ProjectManager.getConfig(project.magnetId, function(e){
                            expect(e).toBeNull();
                            done();
                        });
                    });
                });
            });
        });
    });

    it('should return filePath if a project with the given magnetId exists', function(done){
        ProjectManager.getConfig(testProject.magnetId, function(e, filePath){
            expect(filePath).not.toBeUndefined();
            done();
        });
    });

    it('should return cached flag "true" if a project config is requested twice without any changes to the model', function(done){
        ProjectManager.getConfig(testProject.magnetId, function(e, filePath, isCached){
            expect(isCached).toBe(true);
            done();
        });
    });

});

describe('ProjectManager generateAndUpdateState', function(){

    it('should fail given an invalid project', function(done){
        ProjectManager.generateAndUpdateState('', function(e){
            expect(e).toEqual('invalid-project');
            done();
        });
    });

    it('should fail given a project missing required properties', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, project){
            expect(e).toBeNull();
            delete project.name;
            ProjectManager.generateAndUpdateState(project, function(e){
                expect(e).toEqual('invalid-project-object');
                done();
            });
        });
    });

    it('should succeed given a valid project', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, project){
            expect(e).toBeNull();
            ProjectManager.generateAndUpdateState(project, function(e, filePath){
                expect(filePath).not.toBeUndefined();
                done();
            });
        });
    });

});

describe('ProjectManager generateConfig', function(){

    beforeAll(function(done){
        ProjectManager.read(testProject.magnetId, function(e, project){
            _project = project;
            expect(project).not.toBeUndefined();
            done();
        });
    });

    beforeEach(function(){
        testProject = _project;
    });

    it('should fail given an invalid project', function(done){
        ProjectManager.generateConfig(null, null, function(e){
            expect(e).toEqual('invalid-project-object');
            done();
        });
    });

    it('should succeed given a valid project', function(done){
        ProjectManager.generateConfig(testProject, null, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a path to the zip file given a valid project', function(done){
        ProjectManager.generateConfig(testProject, null, function(e, zipPath){
            expect(zipPath).not.toBeUndefined();
            done();
        });
    });

});

describe('ProjectManager createProjectFolders', function(){

    beforeEach(function(){
        testUser = _user;
        testProject = _project;
    });

    it('should fail given an invalid user id', function(done){
        ProjectManager.createProjectFolders('', testProject.magnetId, function(e){
            expect(e).toEqual('invalid-project');
            done();
        });
    });

    it('should fail given an invalid project magnetId', function(done){
        ProjectManager.createProjectFolders(testUser.id, '', function(e){
            expect(e).toEqual('invalid-project');
            done();
        });
    });

    it('should create folder path given a valid user id and project magnetId', function(done){
        ProjectManager.createProjectFolders(testUser.id, testProject.magnetId, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a path to the zip file given a valid project', function(done){
        ProjectManager.createProjectFolders(testUser.id, testProject.magnetId, function(e, folderPath){
            expect(folderPath).not.toBeUndefined();
            done();
        });
    });

});

describe('ProjectManager renderConfig', function(){
    var modifiedTestProject, wsdls;

    beforeEach(function(){
        modifiedTestProject = {
            name         : 'modified test project name',
            description  : 'modified test project description',
            version      : '2.0',
            apnsEnabled  : true,
            apnsCertName : 'valid-certName.xml'
        }
        wsdls = [{
            url         : 'http://www.magnet.com/wsdl',
            serviceName : 'TestWSDL',
            bindStyle   : 'ws'
        }]
    });

    it('should fail if project is not an object', function(done){
        ProjectManager.renderConfig('', [], function(e){
            expect(e).toEqual('invalid-project-object');
            done();
        });
    });

    it('should fail if project does not have a project name', function(done){
        delete modifiedTestProject.name;
        ProjectManager.renderConfig(modifiedTestProject, [], function(e){
            expect(e).toEqual('invalid-project-object');
            done();
        });
    });

    it('should not have an output containing "server.config.ApnsAccount.certFile" if project has an empty apnsCertName', function(done){
        modifiedTestProject.apnsCertName = '';
        ProjectManager.renderConfig(modifiedTestProject, [], function(e, output){
            expect(output).not.toContain('server.config.ApnsAccount.certFile');
            done();
        });
    });

    it('should have an output containing "server.config.ApnsAccount.certFile" if project has a non-empty apnsCertName', function(done){
        ProjectManager.renderConfig(modifiedTestProject, [], function(e, output){
            expect(output).toContain('server.config.ApnsAccount.certFile');
            done();
        });
    });

    it('should have an output containing wsdl url if wsdl object is passed in the array', function(done){
        ProjectManager.renderConfig(modifiedTestProject, wsdls, function(e, output){
            expect(output).toContain('controllers.TestWSDL.wsdl="http://www.magnet.com/wsdl"');
            done();
        });
    });

    it('should have an output containing wsdl binding style if wsdl object is passed in the array', function(done){
        ProjectManager.renderConfig(modifiedTestProject, wsdls, function(e, output){
            expect(output).toContain('controllers.TestWSDL.type="ws"');
            done();
        });
    });

});

describe('ProjectManager createFile', function(){

    it('should fail given an invalid file path', function(done){
        ProjectManager.createFile('invalid-path/file.txt', 'valid input', function(e){
            expect(e).toEqual('error-creating-file');
            done();
        });
    });

    it('should succeed given a valid file path', function(done){
        ProjectManager.createFile('./tmp/user-projects/test-createFile.txt', 'output string', function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a file path given a valid file path', function(done){
        ProjectManager.createFile('./tmp/user-projects/test-createFile.txt', 'output string', function(e, filePath){
            expect(filePath).toEqual('./tmp/user-projects/test-createFile.txt');
            done();
        });
    });

});

describe('ProjectManager createFile', function(){

    it('should fail given an invalid file path', function(done){
        ProjectManager.createFile('invalid-path/file.txt', 'valid input', function(e){
            expect(e).toEqual('error-creating-file');
            done();
        });
    });

    it('should create a file given a valid file path', function(done){
        ProjectManager.createFile('./tmp/user-projects/test-createFile.txt', 'output string', function(e){
            expect(e).toBeNull();
            fs.exists('./tmp/user-projects/test-createFile.txt', function(exists){
                expect(exists).toBe(true);
                fs.unlink('./tmp/user-projects/test-createFile.txt', function(){
                    done();
                });
            });
        });
    });

    it('should return a file path given a valid file path', function(done){
        ProjectManager.createFile('./tmp/user-projects/test-createFile.txt', 'output string', function(e, filePath){
            expect(filePath).toEqual('./tmp/user-projects/test-createFile.txt');
            fs.exists('./tmp/user-projects/test-createFile.txt', function(exists){
                expect(exists).toBe(true);
                fs.unlink('./tmp/user-projects/test-createFile.txt', function(){
                    done();
                });
            });
        });
    });

});

describe('ProjectManager createFolderIfNotExist', function(){

    it('should fail given an invalid path', function(done){
        ProjectManager.createFolderIfNotExist('invalid-path', 'testfolder', function(e){
            expect(e).toEqual('error-creating-folder');
            done();
        });
    });

    it('should create folder given a valid path', function(done){
        ProjectManager.createFolderIfNotExist('./tmp/user-projects', 'test-folder', function(e){
            expect(e).toBeUndefined();
            fs.exists('./tmp/user-projects/test-folder', function(exists){
                expect(exists).toBe(true);
                fs.rmdir('./tmp/user-projects/test-folder', function(){
                    done();
                });
            });
        });
    });

});

describe('ProjectManager storeProjectFile', function(){

    beforeEach(function(){
        testUser = _user;
        testProject = {
            name        : 'test project name',
            description : 'test project description',
            version     : '1.0',
            jdbcPort    : '3306',
            smtpPort    : 587
        }
    });

    it('should fail given an invalid magnetId', function(done){
        ProjectManager.storeProjectFile('', {}, function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should succeed given a valid magnetId', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, project){
            expect(e).toBeNull();
            ProjectManager.getConfig(project.magnetId, function(e, filePath){
                expect(filePath).not.toBeUndefined();
                var testFilePath = filePath.replace(project.artifactId+'.zip', 'tester.xml');
                fs.writeFile(testFilePath, 'test-file-content', function(err){
                    // mock an HTTP upload request
                    var req = {
                        header : function(input){
                            return input == 'X-Mime-Type' ? 'application/xml' : 'tester.xml';
                        },
                        on : function(input, callback){
                            var out;
                            switch(input){
                                case 'data': out = 'file-content'; break;
                                case 'end': break;
                                case 'error': out = 'mock-error'; break;
                            }
                            callback(out);
                        }
                    };
                    ProjectManager.storeProjectFile(project.magnetId, req, function(e){
                        expect(e).toBeUndefined();
                        done();
                    });
                });
            });
        });
    });

});

describe('ProjectManager removeAPNSCertificate', function(){
    var newProject;

    beforeEach(function(){
        newProject = {
            name        : 'test project name',
            description : 'test project description',
            version     : '1.0'
        }
    });

    it('should fail given an invalid magnetId', function(done){
        ProjectManager.removeAPNSCertificate('', function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should fail given the magnetId of a project which does not have an APNS certificate', function(done){
        ProjectManager.create(testUser.magnetId, newProject, function(e, project){
            expect(e).toBeNull();
            ProjectManager.removeAPNSCertificate(project.magnetId, function(e){
                expect(e).toEqual('error-deleting-file');
                done();
            });
        });
    });

    it('should delete the file given the magnetId of a project which does have an APNS certificate', function(done){
        newProject.apnsCertName = 'test-apns.xml';
        ProjectManager.create(testUser.magnetId, newProject, function(e, project){
            expect(e).toBeNull();
            ProjectManager.createProjectFolders(testUser.id, project.magnetId, function(e){
                expect(e).toBeNull();
                ProjectManager.createFile('./tmp/user-projects/'+testUser.id+'/'+project.magnetId+'/'+newProject.apnsCertName, 'valid input', function(e){
                    expect(e).toBeNull();
                    ProjectManager.removeAPNSCertificate(project.magnetId, function(e){
                        expect(e).toBeNull();
                        fs.exists('./tmp/user-projects/'+testUser.id+'/'+project.magnetId+'/'+newProject.apnsCertName, function(exists){
                            expect(exists).toBe(false);
                            done();
                        });
                    });
                });
            });
        });
    });

    it('should set the apnsCertName value of the project model to be empty string', function(done){
        newProject.apnsCertName = 'test-apns2.xml';
        ProjectManager.create(testUser.magnetId, newProject, function(e, project){
            expect(e).toBeNull();
            ProjectManager.createProjectFolders(testUser.id, newProject.magnetId, function(e){
                expect(e).toBeNull();
                ProjectManager.createFile('./tmp/user-projects/'+testUser.id+'/'+project.magnetId+'/'+newProject.apnsCertName, 'valid input', function(e){
                    expect(e).toBeNull();
                    ProjectManager.removeAPNSCertificate(project.magnetId, function(e){
                        expect(e).toBeNull();
                        ProjectManager.read(project.magnetId, function(e, project){
                            expect(project.apnsCertName).toEqual('');
                            done();
                        });
                    });
                });
            });
        });
    });

});

describe('ProjectManager addWebServiceURL', function(){
    var url = 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl';

    beforeEach(function(){
        testProject = _project;
    });

    it('should fail given an invalid project magnetId', function(done){
        ProjectManager.addWebServiceURL('', testUser.id, url, function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should fail given an invalid project magnetId', function(done){
        ProjectManager.addWebServiceURL(testProject.magnetId, '', url, function(e){
            expect(e).toEqual('not-authorized');
            done();
        });
    });

    it('should fail given an invalid url', function(done){
        ProjectManager.addWebServiceURL(testProject.magnetId, testUser.id, 'invalid-url-format', function(e){
            expect(e).toBe('request-error');
            done();
        });
    });

    it('should succeed if all parameters are valid', function(done){
        ProjectManager.addWebServiceURL(testProject.magnetId, testUser.id, url, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return model containing url if method completed successfully', function(done){
        ProjectManager.addWebServiceURL(testProject.magnetId, testUser.id, url, function(e, model){
            expect(model.url).toEqual(url);
            _wsdl = model;
            done();
        });
    });

});

describe('ProjectManager removeWebServiceURL', function(){
    var url = 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl';

    beforeEach(function(){
        testWSDL = _wsdl;
    });

    it('should fail given an invalid wsdl magnetId', function(done){
        ProjectManager.removeWebServiceURL('', function(e){
            expect(e).toEqual('wsdl-not-found');
            done();
        });
    });

    it('should remove WSDL model given a valid wsdl magnetId', function(done){
        ProjectManager.removeWebServiceURL(testWSDL.magnetId, function(e){
            expect(e).toBeNull();
            ProjectManager.readWSDL(testWSDL.magnetId, function(e){
                expect(e).toEqual('wsdl-not-found');
                done();
            });
        });
    });

});

describe('ProjectManager readWSDL', function(){

    beforeEach(function(){
        testWSDL = _wsdl;
    });

    it('should fail given an invalid wsdl magnetId', function(done){
        ProjectManager.readWSDL('', function(e){
            expect(e).toEqual('wsdl-not-found');
            done();
        });
    });

    it('should return wsdl model given a valid magnetId', function(done){
        ProjectManager.addWebServiceURL(testProject.magnetId, testUser.id, 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl', function(e, model){
            expect(e).toBeNull();
            ProjectManager.readWSDL(model.magnetId, function(e, wsdl){
                expect(wsdl.url).toEqual('http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl');
                done();
            });
        });
    });

});

describe('ProjectManager getWebServices', function(){

    it('should fail given an invalid wsdl magnetId', function(done){
        ProjectManager.getWebServices('', function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should return a collection of wsdls given a valid project magnetId', function(done){
        ProjectManager.getWebServices(testProject.magnetId, function(e, wsdls){
            expect(wsdls).not.toBeUndefined();
            done();
        });
    });

});