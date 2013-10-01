var ProjectManager = require('../lib/ProjectManager')
, UserManager = require('../lib/UserManager')
, fs = require('fs')
, magnetId = require('node-uuid');

// TODO: Database details are hardcoded!
require('../lib/orm').setup('./lib/models', true, 'developercentertest', 'root');

jasmine.getEnv().defaultTimeoutInterval = 30000;

var beforeAll = function(fn){
    it('[beforeAll]', fn);
}

var testProject, testUser, _user, _project, testWSDL, _wsdl;

describe('ProjectManager database setup', function(){

    _user = {
        firstName   : 'Pyramid',
        lastName    : 'Hefeweizen',
        email       : 'demouser@magnet.com',
        magnetId    : 'd2cf1210-25ae-11e3-a8c7-c743ef283553',
        userType    : 'developer',
        password    : 'wheatale',
        companyName : 'beer'
    };

    beforeAll(function(done){
        UserManager.read(_user.magnetId, null, function(e, user){
            if(!user){
                UserManager.create(_user, function(e, user){
                    _user = user;
                    expect(e).toBeNull();
                    done();
                });
            }else{
                _user = user;
                done();
            }
        });
    });

});

describe('ProjectManager create', function(){

    beforeEach(function(){
        testUser = _user;
        testProject = {
            name        : 'test project name',
            description : 'test project description',
            version     : '1.0'
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

    it('should fail if project version is missing', function(done){
        delete testProject.version;
        ProjectManager.create(testUser.magnetId, testProject, function(e){
            expect(e).toEqual('invalid-body');
            done();
        });
    });

    it('should succeed if data is valid', function(done){
        ProjectManager.create(testUser.magnetId, testProject, function(e, magnetId){
            _project = testProject;
            _project.magnetId = magnetId;
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
            magnetId    : 'new magnetId'
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
        ProjectManager.generateConfig(null, function(e){
            expect(e).toEqual('invalid-project-object');
            done();
        });
    });

    it('should succeed given a valid project', function(done){
        ProjectManager.generateConfig(testProject, function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a path to the zip file given a valid project', function(done){
        ProjectManager.generateConfig(testProject, function(e, zipPath){
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
    var modifiedTestProject;

    beforeEach(function(){
        modifiedTestProject = {
            name         : 'modified test project name',
            description  : 'modified test project description',
            version      : '2.0',
            apnsEnabled  : true,
            apnsCertName : 'valid-certName.xml'
        }
    });

    it('should fail if project is not an object', function(done){
        ProjectManager.renderConfig('', function(e){
            expect(e).toEqual('invalid-project-object');
            done();
        });
    });

    it('should fail if project does not have a project name', function(done){
        delete modifiedTestProject.name;
        ProjectManager.renderConfig(modifiedTestProject, function(e){
            expect(e).toEqual('invalid-project-object');
            done();
        });
    });

    it('should not have an output containing "server.config.ApnsAccount.certFile" if project has an empty apnsCertName', function(done){
        modifiedTestProject.apnsCertName = '';
        ProjectManager.renderConfig(modifiedTestProject, function(e, output){
            expect(output).not.toContain('server.config.ApnsAccount.certFile');
            done();
        });
    });

    it('should have an output containing "server.config.ApnsAccount.certFile" if project has a non-empty apnsCertName', function(done){
        ProjectManager.renderConfig(modifiedTestProject, function(e, output){
            expect(output).toContain('server.config.ApnsAccount.certFile');
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
        ProjectManager.createFile('./target/user-projects/test-createFile.txt', 'output string', function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return a file path given a valid file path', function(done){
        ProjectManager.createFile('./target/user-projects/test-createFile.txt', 'output string', function(e, filePath){
            expect(filePath).toEqual('./target/user-projects/test-createFile.txt');
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
        ProjectManager.createFile('./target/user-projects/test-createFile.txt', 'output string', function(e){
            expect(e).toBeNull();
            fs.exists('./target/user-projects/test-createFile.txt', function(exists){
                expect(exists).toBe(true);
                fs.unlink('./target/user-projects/test-createFile.txt', function(){
                    done();
                });
            });
        });
    });

    it('should return a file path given a valid file path', function(done){
        ProjectManager.createFile('./target/user-projects/test-createFile.txt', 'output string', function(e, filePath){
            expect(filePath).toEqual('./target/user-projects/test-createFile.txt');
            fs.exists('./target/user-projects/test-createFile.txt', function(exists){
                expect(exists).toBe(true);
                fs.unlink('./target/user-projects/test-createFile.txt', function(){
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
        ProjectManager.createFolderIfNotExist('./target/user-projects', 'test-folder', function(e){
            expect(e).toBeUndefined();
            fs.exists('./target/user-projects/test-folder', function(exists){
                expect(exists).toBe(true);
                fs.rmdir('./target/user-projects/test-folder', function(){
                    done();
                });
            });
        });
    });

});

describe('ProjectManager storeProjectFile', function(){
    var req;

    beforeEach(function(){
        req = {};
    });

    it('should fail given an invalid magnetId', function(done){
        ProjectManager.storeProjectFile('', req, function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    //TODO: test upload of apns certificate

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
        ProjectManager.create(testUser.magnetId, newProject, function(e, magnetId){
            expect(e).toBeNull();
            ProjectManager.removeAPNSCertificate(magnetId, function(e){
                expect(e).toEqual('error-deleting-file');
                done();
            });
        });
    });

    it('should delete the file given the magnetId of a project which does have an APNS certificate', function(done){
        newProject.apnsCertName = 'test-apns.xml';
        ProjectManager.create(testUser.magnetId, newProject, function(e, magnetId){
            expect(e).toBeNull();
            ProjectManager.createProjectFolders(testUser.id, magnetId, function(e){
                expect(e).toBeNull();
                ProjectManager.createFile('./target/user-projects/'+testUser.id+'/'+magnetId+'/'+newProject.apnsCertName, 'valid input', function(e){
                    expect(e).toBeNull();
                    ProjectManager.removeAPNSCertificate(magnetId, function(e){
                        expect(e).toBeNull();
                        fs.exists('./target/user-projects/'+testUser.id+'/'+magnetId+'/'+newProject.apnsCertName, function(exists){
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
        ProjectManager.create(testUser.magnetId, newProject, function(e, magnetId){
            expect(e).toBeNull();
            ProjectManager.createProjectFolders(testUser.id, newProject.magnetId, function(e){
                expect(e).toBeNull();
                ProjectManager.createFile('./target/user-projects/'+testUser.id+'/'+magnetId+'/'+newProject.apnsCertName, 'valid input', function(e){
                    expect(e).toBeNull();
                    ProjectManager.removeAPNSCertificate(magnetId, function(e){
                        expect(e).toBeNull();
                        ProjectManager.read(magnetId, function(e, project){
                            expect(project.apnsCertName).toEqual('');
                            done();
                        });
                    });
                });
            });
        });
    });

});

describe('ProjectManager addWSDLUrl', function(){

    beforeEach(function(){
        testProject = _project;
    });

    it('should fail given an invalid project magnetId', function(done){
        ProjectManager.addWSDLUrl('', testUser.id, 'http://www.magnet.com', function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should fail given an invalid project magnetId', function(done){
        ProjectManager.addWSDLUrl(testProject.magnetId, '', 'http://www.magnet.com', function(e){
            expect(e).toEqual('add-wsdl-not-authorized');
            done();
        });
    });

    it('should fail given an invalid url', function(done){
        ProjectManager.addWSDLUrl(testProject.magnetId, testUser.id, 'invalid-url-format', function(e){
            expect(e).toBe('invalid-url');
            done();
        });
    });

    it('should succeed if all parameters are valid', function(done){
        ProjectManager.addWSDLUrl(testProject.magnetId, testUser.id, 'http://www.magnet.com', function(e){
            expect(e).toBeNull();
            done();
        });
    });

    it('should return model containing url if method completed successfully', function(done){
        ProjectManager.addWSDLUrl(testProject.magnetId, testUser.id, 'http://www.magnet.com', function(e, model){
            expect(model.url).toEqual('http://www.magnet.com');
            _wsdl = model;
            done();
        });
    });

});

describe('ProjectManager removeWSDLUrl', function(){

    beforeEach(function(){
        testWSDL = _wsdl;
    });

    it('should fail given an invalid wsdl magnetId', function(done){
        ProjectManager.removeWSDLUrl('', function(e){
            expect(e).toEqual('wsdl-not-found');
            done();
        });
    });

    it('should remove WSDL model given a valid wsdl magnetId', function(done){
        ProjectManager.removeWSDLUrl(testWSDL.magnetId, function(e){
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
        ProjectManager.addWSDLUrl(testProject.magnetId, testUser.id, 'http://www.magnet.com', function(e, model){
            expect(e).toBeNull();
            ProjectManager.readWSDL(model.magnetId, function(e, wsdl){
                expect(wsdl.url).toEqual('http://www.magnet.com');
                done();
            });
        });
    });

});

describe('ProjectManager getWSDLs', function(){

    it('should fail given an invalid wsdl magnetId', function(done){
        ProjectManager.getWSDLs('', function(e){
            expect(e).toEqual('project-not-found');
            done();
        });
    });

    it('should return a collection of wsdls given a valid project magnetId', function(done){
        ProjectManager.getWSDLs(testProject.magnetId, function(e, wsdls){
            expect(wsdls).not.toBeUndefined();
            done();
        });
    });

});