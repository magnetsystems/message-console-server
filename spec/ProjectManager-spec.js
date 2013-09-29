var ProjectManager = require('../lib/ProjectManager')
, UserManager = require('../lib/UserManager')
, magnetId = require('node-uuid');

// TODO: Database details are hardcoded!
require('../lib/orm').setup('./lib/models', true, 'developercentertest', 'root');

var beforeAll = function(fn){
    it('[beforeAll]', fn, 100000);
}

var testProject, testUser, _user, _project;

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
        ProjectManager.getConfig('', function(e, filePath){
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
