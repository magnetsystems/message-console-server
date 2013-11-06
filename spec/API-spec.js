var Transport = require('../lib/Transport')
, UserManager = require('../lib/UserManager')
, ProjectManager = require('../lib/ProjectManager')
, orm = require('../lib/orm');

jasmine.getEnv().defaultTimeoutInterval = 30000;

var developerUser
, developerUserCookie
, deactivatedDeveloperUser
, deactivatedDeveloperUserCookie
, guestUser
, guestUserCookie
, adminHeaders
, adminCookie
, adminUser = Transport.extend({}, ENV_CONFIG.Users.admin.user);

describe('API test database setup', function(){

    developerUser = {
        firstName   : 'Activated',
        lastName    : 'Developer',
        email       : 'developerUser'+(Math.round(+new Date()/1000))+'@magnet.com',
        userType    : 'developer',
        password    : 'wheatale',
        companyName : 'beer',
        activated   : true
    };

    deactivatedDeveloperUser = {
        firstName   : 'Deactivated',
        lastName    : 'Developer',
        email       : 'deactivatedDeveloperUser'+(Math.round(+new Date()/1000))+'@magnet.com',
        userType    : 'developer',
        password    : 'wheatale',
        companyName : 'beer',
        activated   : false
    };

    guestUser = {
        firstName   : 'Activated',
        lastName    : 'Guest',
        email       : 'guestUser'+(Math.round(+new Date()/1000))+'@magnet.com',
        userType    : 'guest',
        password    : 'wheatale',
        companyName : 'beer',
        activated   : true
    };

    beforeAll(function(done){
        orm.setup('./lib/models', function(){
            // create regular developer
            UserManager.create(Transport.extend({}, developerUser), function(e, user){
                developerUser.id = user.id;
                developerUser.magnetId = user.magnetId;
                expect(user).not.toBeUndefined();

                // get cookie of developerUser user
                Transport.request({
                    path    : '/login',
                    method  : 'POST'
                }, {
                    username : developerUser.email,
                    password : developerUser.password
                }, function(e, out, res){
                    expect(e).toBeNull();
                    developerUserCookie = res.headers['set-cookie'][0];

                    // create deactivated developer
                    UserManager.create(Transport.extend({}, deactivatedDeveloperUser), function(e, user){
                        deactivatedDeveloperUser.id = user.id;
                        deactivatedDeveloperUser.magnetId = user.magnetId;
                        expect(user).not.toBeUndefined();

                        // get cookie of deactivatedDeveloperUser user
                        Transport.request({
                            path    : '/login',
                            method  : 'POST'
                        }, {
                            username : deactivatedDeveloperUser.email,
                            password : deactivatedDeveloperUser.password
                        }, function(e, out, res){
                            expect(e).toBeNull();
                            deactivatedDeveloperUserCookie = res.headers['set-cookie'][0];

                            // create activated guest
                            UserManager.create(Transport.extend({}, guestUser), function(e, user){
                                guestUser.id = user.id;
                                guestUser.magnetId = user.magnetId;
                                expect(user).not.toBeUndefined();

                                // get cookie of guestUser user
                                Transport.request({
                                    path    : '/login',
                                    method  : 'POST'
                                }, {
                                    username : guestUser.email,
                                    password : guestUser.password
                                }, function(e, out, res){
                                    expect(e).toBeNull();
                                    guestUserCookie = res.headers['set-cookie'][0];

                                    // get cookie of an admin user
                                    Transport.request({
                                        path    : '/login',
                                        method  : 'POST'
                                    }, {
                                        username : adminUser.email,
                                        password : adminUser.password
                                    }, function(e, out, res){
                                        expect(e).toBeNull();
                                        expect(res.statusCode).toEqual(302);
                                        expect(out).toEqual('Moved Temporarily. Redirecting to /');
                                        adminHeaders = res.headers;
                                        adminCookie = adminHeaders['set-cookie'][0];
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

});

describe('/login (form based login)', function(){

    it('should redirect to login page with invalid flag given invalid credentials', function(done){
        Transport.request({
            path    : '/login',
            method  : 'POST'
        }, {
            username : 'invalid',
            password : 'invalid'
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(302);
            expect(out).toEqual('Moved Temporarily. Redirecting to /login?status=invalid');
            done();
        });
    });

    it('should redirect to login page with locked flag given valid credentials of a deactivated user', function(done){
        Transport.request({
            path    : '/login',
            method  : 'POST'
        }, {
            username : deactivatedDeveloperUser.email,
            password : deactivatedDeveloperUser.password
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(302);
            expect(out).toEqual('Moved Temporarily. Redirecting to /login?status=locked');
            done();
        });
    });

    it('should redirect to home page given valid credentials', function(done){
        Transport.request({
            path    : '/login',
            method  : 'POST'
        }, {
            username : developerUser.email,
            password : developerUser.password
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(302);
            expect(out).toEqual('Moved Temporarily. Redirecting to /');
            done();
        });
    });

});

describe('/rest/login (artifactory login)', function(){

    it('should fail given invalid credentials', function(done){
        Transport.request({
            path    : '/rest/login',
            method  : 'POST'
        }, {
            name     : 'invalid',
            password : 'invalid'
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(401);
            expect(out).toEqual('invalid-login');
            done();
        });
    });

    it('should fail given a valid user whose account is locked', function(done){
        Transport.request({
            path    : '/rest/login',
            method  : 'POST'
        }, {
            name     : deactivatedDeveloperUser.email,
            password : deactivatedDeveloperUser.password
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(401);
            expect(out).toEqual('account-locked');
            done();
        });
    });

    it('should succeed given valid credentials', function(done){
        Transport.request({
            path    : '/rest/login',
            method  : 'POST'
        }, {
            name     : developerUser.email,
            password : developerUser.password
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out).toEqual('SUCCESS');
            done();
        });
    });

});

describe('/rest/:model', function(){

    var tempAdminUser;
    beforeEach(function(){
        tempAdminUser = Transport.extend({}, adminUser);
    });

    it('should return page not found given session cookie of a developer', function(done){
        Transport.request({
            path    : '/rest/users',
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(404);
            expect(JSON.stringify(out)).toContain('<title>Developer Factory : Page Not Found</title>');
            done();
        });
    });

    it('should return a list of users given session cookie of an admin', function(done){
        Transport.request({
            path    : '/rest/users',
            method  : 'GET',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(JSON.stringify(out)).toContain('"paging":{"start":0,"rpp":10');
            done();
        });
    });

    it('should return a list of projects', function(done){
        Transport.request({
            path    : '/rest/projects',
            method  : 'GET',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(JSON.stringify(out)).toContain('"paging":{"start":0,"rpp":10');
            done();
        });
    });

    it('should return a list of events', function(done){
        Transport.request({
            path    : '/rest/events',
            method  : 'GET',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(JSON.stringify(out)).toContain('"paging":{"start":0,"rpp":10');
            done();
        });
    });

    it('should return a list of users matching a search criteria', function(done){
        Transport.request({
            path    : '/rest/users?magnetId='+tempAdminUser.magnetId,
            method  : 'GET',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(JSON.stringify(out)).toContain('{"paging":{"start":0,"rpp":10,"total":1}');
            done();
        });
    });

    it('should return a list of users with a different starting index', function(done){
        Transport.request({
            path    : '/rest/users?_magnet_page=1&magnetId='+tempAdminUser.magnetId,
            method  : 'GET',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(JSON.stringify(out)).toContain('{"paging":{"start":1,"rpp":10,"total":1}');
            done();
        });
    });

    it('should return a list of users with a different number of results per page', function(done){
        Transport.request({
            path    : '/rest/users?_magnet_page_size=1',
            method  : 'GET',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(JSON.stringify(out)).toContain('{"paging":{"start":0,"rpp":1,');
            done();
        });
    });

});

describe('GET /rest/:model/:id', function(){

    it('should not allow a developer user to access information about another user', function(done){
        Transport.request({
            path    : '/rest/users/'+deactivatedDeveloperUser.magnetId,
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('user-fetch-failed');
            done();
        });
    });

    it('should return a single user given session cookie of a developer matching the requested user', function(done){
        Transport.request({
            path    : '/rest/users/'+developerUser.magnetId,
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out.email).toEqual(developerUser.email);
            expect(out.magnetId).toEqual(developerUser.magnetId);
            expect(out.firstName).toEqual(developerUser.firstName);
            expect(out.lastName).toEqual(developerUser.lastName);
            done();
        });
    });

    it('should only return email of the requested user given no session cookie', function(done){
        Transport.request({
            path    : '/rest/users/'+developerUser.magnetId,
            method  : 'GET'
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out.email).toEqual(developerUser.email);
            done();
        });
    });

    it('should return a single user given session cookie of an admin', function(done){
        Transport.request({
            path    : '/rest/users/'+developerUser.magnetId,
            method  : 'GET',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out.email).toEqual(developerUser.email);
            expect(out.magnetId).toEqual(developerUser.magnetId);
            expect(out.firstName).toEqual(developerUser.firstName);
            expect(out.lastName).toEqual(developerUser.lastName);
            done();
        });
    });

});

describe('PUT /rest/:model/:id', function(){

    var testDeveloperUser = Transport.extend({}, developerUser, {
        email : 'testDeveloperUser1'+(Math.round(+new Date()/1000))+'@magnet.com'
    });

    beforeAll(function(done){
        UserManager.create(Transport.extend({}, testDeveloperUser), function(e, user){
            testDeveloperUser = user;
            expect(testDeveloperUser).not.toBeUndefined();
            done();
        });
    });

    it('should return 404 error given the session cookie of a developer', function(done){
        Transport.request({
            path    : '/rest/users/'+testDeveloperUser.magnetId,
            method  : 'PUT',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(404);
            expect(out).toEqual('Cannot PUT /rest/users/'+testDeveloperUser.magnetId);
            done();
        });
    });

    it('should fail update given an invalid magnetId', function(done){
        Transport.request({
            path    : '/rest/users/invalid',
            method  : 'PUT',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('model-not-found');
            done();
        });
    });

    it('should update a single user given a valid magnetId using session cookie of an admin', function(done){
        Transport.request({
            path    : '/rest/users/'+testDeveloperUser.magnetId,
            method  : 'PUT',
            headers : {
                'Cookie' : adminCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            done();
        });
    });

});

describe('GET /rest/profile', function(){

    it('should return 278 session expired error given no session cookie', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'GET'
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(278);
            expect(out).toEqual('session-expired');
            done();
        });
    });

    it('should return 278 session expired error given the session cookie of a guest user', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'GET',
            headers : {
                'Cookie' : guestUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(278);
            expect(out).toEqual('session-expired');
            done();
        });
    });

    it('should return 278 session expired error given the session cookie of a deactivated user', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'GET',
            headers : {
                'Cookie' : deactivatedDeveloperUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(278);
            expect(out).toEqual('session-expired');
            done();
        });
    });

    it('should return user profile given a valid session cookie', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out.email).toEqual(developerUser.email);
            expect(out.magnetId).toEqual(developerUser.magnetId);
            expect(out.firstName).toEqual(developerUser.firstName);
            expect(out.lastName).toEqual(developerUser.lastName);
            done();
        });
    });

});


describe('PUT /rest/profile', function(){

    var testDeveloperUserCookie, testDeveloperUser = Transport.extend({}, developerUser, {
        email : 'testDeveloperUser2'+(Math.round(+new Date()/1000))+'@magnet.com'
    });

    var modifiedValues = {
        firstName   : 'modifiedFirstName',
        lastName    : 'modifiedLastName',
        companyName : 'modifiedCompanyName'
    };

    beforeAll(function(done){
        UserManager.create(Transport.extend({}, testDeveloperUser), function(e, user){
            testDeveloperUser.id = user.id;
            testDeveloperUser.magnetId = user.magnetId;
            expect(testDeveloperUser).not.toBeUndefined();
            // get cookie of an admin user
            Transport.request({
                path    : '/login',
                method  : 'POST'
            }, {
                username : testDeveloperUser.email,
                password : testDeveloperUser.password
            }, function(e, out, res){
                expect(e).toBeNull();
                expect(out).toEqual('Moved Temporarily. Redirecting to /');
                testDeveloperUserCookie = res.headers['set-cookie'][0];
                done();
            });
        });
    });

    it('should return 278 session expired error given no session cookie', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'PUT'
        }, {
            firstName : 'modifiedFirstName'
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(278);
            expect(out).toEqual('session-expired');
            done();
        });
    });

    it('should return 278 session expired error given the session cookie of a guest user', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'PUT',
            headers : {
                'Cookie' : guestUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(278);
            expect(out).toEqual('session-expired');
            done();
        });
    });

    it('should return 278 session expired error given the session cookie of a deactivated user', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'PUT',
            headers : {
                'Cookie' : deactivatedDeveloperUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(278);
            expect(out).toEqual('session-expired');
            done();
        });
    });

    it('should update user profile given a valid session cookie', function(done){
        Transport.request({
            path    : '/rest/profile',
            method  : 'PUT',
            headers : {
                'Cookie'       : testDeveloperUserCookie,
                'Content-Type' : 'application/json'
            }
        }, modifiedValues, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            Transport.request({
                path    : '/rest/profile',
                method  : 'GET',
                headers : {
                    'Cookie' : testDeveloperUserCookie
                }
            }, null, function(e, out, res){
                expect(e).toBeNull();
                expect(res.statusCode).toEqual(200);
                expect(out.email).toEqual(testDeveloperUser.email);
                expect(out.magnetId).toEqual(testDeveloperUser.magnetId);
                expect(out.firstName).toEqual(modifiedValues.firstName);
                expect(out.lastName).toEqual(modifiedValues.lastName);
                expect(out.companyName).toEqual(modifiedValues.companyName);
                done();
            });
        });
    });

});

describe('GET /rest/projects/:magnetId', function(){

    var testProject = {
        name        : 'test project name',
        description : 'test project description',
        version     : '1.0'
    };

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            done();
        });
    });

    it('should return error given an invalid project magnetId', function(done){
        Transport.request({
            path    : '/rest/projects/invalid',
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('project-not-found');
            done();
        });
    });

    it('should return project model given a valid session cookie', function(done){
        Transport.request({
            path    : '/rest/projects/'+testProject.magnetId,
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out.name).toEqual(testProject.name);
            expect(out.description).toEqual(testProject.description);
            expect(out.version).toEqual(testProject.version);
            done();
        });
    });

});

describe('POST /rest/projects', function(){

    var testProject = {
        name        : 'test project name2',
        description : 'test project description2',
        version     : '2.0'
    };

    var invalidProjectData = {
        description : 'test project description2',
        version     : '2.0'
    };

    it('should fail create a project given invalid data', function(done){
        Transport.request({
            path    : '/rest/projects',
            method  : 'POST',
            headers : {
                'Cookie'       : developerUserCookie,
                'Content-Type' : 'application/json'
            }
        }, invalidProjectData, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('invalid-body');
            done();
        });
    });

    it('should create a project given valid data', function(done){
        Transport.request({
            path    : '/rest/projects',
            method  : 'POST',
            headers : {
                'Cookie'       : developerUserCookie,
                'Content-Type' : 'application/json'
            }
        }, testProject, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out.id).not.toBeUndefined();
            expect(out.magnetId).not.toBeUndefined();
            done();
        });
    });

});

// TODO: only tested positive use case
describe('PUT /rest/projects/:magnetId', function(){

    var testProject = {
        name        : 'test project name',
        description : 'test project description',
        version     : '1.0'
    };

    var modifiedTestProject = {
        name        : 'test project name 2',
        description : 'test project description 2',
        version     : '2.0'
    };

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            done();
        });
    });

    it('should return error given an invalid project magnetId', function(done){
        Transport.request({
            path    : '/rest/projects/invalid',
            method  : 'PUT',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('project-not-found');
            done();
        });
    });

    it('should update project model given valid data', function(done){
        Transport.request({
            path    : '/rest/projects/'+testProject.magnetId,
            method  : 'PUT',
            headers : {
                'Cookie'       : developerUserCookie,
                'Content-Type' : 'application/json'
            }
        }, modifiedTestProject, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            Transport.request({
                path    : '/rest/projects/'+testProject.magnetId,
                method  : 'GET',
                headers : {
                    'Cookie' : developerUserCookie
                }
            }, null, function(e, out, res){
                expect(e).toBeNull();
                expect(res.statusCode).toEqual(200);
                expect(out.name).toEqual(modifiedTestProject.name);
                expect(out.description).toEqual(modifiedTestProject.description);
                expect(out.version).toEqual(modifiedTestProject.version);
                done();
            });
        });
    });

});

// TODO: only tested positive use case
describe('GET /rest/projects/:magnetId/getConfig', function(){

    var testProject = {
        name        : 'test project name 3',
        description : 'test project description 3',
        version     : '3.0'
    };

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            done();
        });
    });

    it('should return error given an invalid project magnetId', function(done){
        Transport.request({
            path    : '/rest/projects/invalid/getConfig',
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('project-not-found');
            done();
        });
    });

    it('should return a config file', function(done){
        Transport.request({
            path    : '/rest/projects/'+testProject.magnetId+'/getConfig',
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out).toContain('test-project-name-3.mapp');
            done();
        });
    });

});

// TODO: only tested positive use case
describe('POST /rest/projects/:magnetId/uploadAPNSCertificate', function(){

    var testProject = {
        name        : 'test project name 4',
        description : 'test project description 4',
        version     : '4.0'
    };

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            done();
        });
    });

    it('should return error given an invalid project magnetId', function(done){
        Transport.request({
            path    : '/rest/projects/invalid/uploadAPNSCertificate',
            method  : 'POST',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('project-not-found');
            done();
        });
    });

    xit('should be able to upload an APNS certificate', function(done){
        Transport.request({
            path    : '/rest/projects/'+testProject.magnetId+'/uploadAPNSCertificate',
            method  : 'POST',
            headers : {
                'Cookie'       : developerUserCookie,
                'Content-Type' : 'multipart/form-data'
            }
        }, {
            certificate : 'certificate'
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(out).toContain('test-project-name-3.mapp');
            done();
        });
    });

});

// TODO: only tested positive use case
describe('POST /rest/projects/:magnetId/removeAPNSCertificate', function(){

    var testProject = {
        name        : 'test project name 5',
        description : 'test project description 5',
        version     : '5.0'
    };

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            done();
        });
    });

    it('should return error given an invalid project magnetId', function(done){
        Transport.request({
            path    : '/rest/projects/invalid/removeAPNSCertificate',
            method  : 'POST',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(400);
            expect(out).toEqual('project-not-found');
            done();
        });
    });

});

// TODO: only tested positive use case
describe('POST /rest/projects/:magnetId/addWebServiceURL', function(){

    var testProject = {
        name        : 'test project name 6',
        description : 'test project description 6',
        version     : '6.0'
    };

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            done();
        });
    });

    it('should add WSDL url', function(done){
        Transport.request({
            path    : '/rest/projects/'+testProject.magnetId+'/addWebServiceURL',
            method  : 'POST',
            headers : {
                'Cookie'       : developerUserCookie,
                'Content-Type' : 'application/json'
            }
        }, {
            url : 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl'
        }, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            Transport.request({
                path    : '/rest/projects/'+testProject.magnetId+'/webservices',
                method  : 'GET',
                headers : {
                    'Cookie' : developerUserCookie
                }
            }, null, function(e, out, res){
                expect(e).toBeNull();
                expect(res.statusCode).toEqual(200);
                expect(JSON.stringify(out)).toContain('http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl');
                done();
            });
        });
    });

});

// TODO: only tested positive use case
describe('GET /rest/projects/:magnetId/webservices', function(){

    var testProject = {
        name        : 'test project name 7',
        description : 'test project description 7',
        version     : '7.0'
    };

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            Transport.request({
                path    : '/rest/projects/'+testProject.magnetId+'/addWebServiceURL',
                method  : 'POST',
                headers : {
                    'Cookie'       : developerUserCookie,
                    'Content-Type' : 'application/json'
                }
            }, {
                url : 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl'
            }, function(e, out, res){
                expect(e).toBeNull();
                expect(res.statusCode).toEqual(200);
                done();
            });
        });
    });

    it('should return a list of WSDLs', function(done){
        Transport.request({
            path    : '/rest/projects/'+testProject.magnetId+'/webservices',
            method  : 'GET',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            expect(JSON.stringify(out)).toContain('http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl');
            done();
        });
    });

});

// TODO: only tested positive use case
describe('DELETE /rest/wsdls/:magnetId', function(){

    var testProject = {
        name        : 'test project name 8',
        description : 'test project description 8',
        version     : '8.0'
    };

    var testWSDL;

    beforeAll(function(done){
        ProjectManager.create(developerUser.magnetId, testProject, function(e, project){
            testProject.magnetId = project.magnetId;
            expect(e).toBeNull();
            Transport.request({
                path    : '/rest/projects/'+testProject.magnetId+'/addWebServiceURL',
                method  : 'POST',
                headers : {
                    'Cookie'       : developerUserCookie,
                    'Content-Type' : 'application/json'
                }
            }, {
                url : 'http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl'
            }, function(e, out, res){
                expect(e).toBeNull();
                expect(res.statusCode).toEqual(200);
                expect(out.url).toEqual('http://ec2-184-73-100-147.compute-1.amazonaws.com:7001/yp/YellowPagesService?wsdl');
                testWSDL = out;
                done();
            });
        });
    });

    it('should be able to delete a WSDL', function(done){
        Transport.request({
            path    : '/rest/wsdls/'+testWSDL.magnetId,
            method  : 'DELETE',
            headers : {
                'Cookie' : developerUserCookie
            }
        }, null, function(e, out, res){
            expect(e).toBeNull();
            expect(res.statusCode).toEqual(200);
            Transport.request({
                path    : '/rest/projects/'+testProject.magnetId+'/webservices',
                method  : 'GET',
                headers : {
                    'Cookie' : developerUserCookie
                }
            }, null, function(e, out, res){
                expect(e).toBeNull();
                expect(res.statusCode).toEqual(200);
                expect(JSON.stringify(out)).not.toContain(testWSDL.url);
                done();
            });
        });
    });

});