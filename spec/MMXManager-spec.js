var MMXManager = require("../lib/MMXManager")
, UserManager = require('../lib/UserManager')
, Helper = require('./Helper')
, orm = require('../lib/orm')
, fs = require('fs')
, sinon = require('sinon')
, mysql = require('mysql')
, magnetId = require('node-uuid')
, _ = require('underscore');

jasmine.getEnv().defaultTimeoutInterval = 5000;

describe('MMXManager', function(){

    var _user = {
        firstName: "John",
        lastName: "Appleseed",
        email: magnetId.v1()+'@magnet.com',
        password: 'admin',
        companyName: "Apple Inc.",
        userType: 'admin'
    };

    var _app = {};

    beforeAll(function(done){
        ENV_CONFIG.MMX.host = 'citest01.magneteng.com';
        ENV_CONFIG.MMX.user = 'admin';
        ENV_CONFIG.MMX.password = 'test';
        ENV_CONFIG.MMX.webPort = 9090;
        ENV_CONFIG.MMX.publicPort = 5220;
        ENV_CONFIG.MMX.adminPort = 7070;
        orm.setup('./lib/models', function(){
            UserManager.create(_user, function(e, newUser){
                expect(e).toBeNull();
                _user = newUser;
                var appName = magnetId.v1();
                MMXManager.createApp(_user.email, _user.magnetId, {
                    name : appName
                }, function(e, app){
                    if(e){
                        expect(e).toEqual('failed-test');
                        done();
                    }else{
                        _app = app;
                        done();
                    }
                });
            });
        });
    });

    describe('createApp', function(){

        it("should fail to create an app given invalid body", function(done) {
            MMXManager.createApp(_user.email, _user.magnetId, null, function(e, app){
                if(e){
                    expect(e).toEqual('invalid-body');
                    done();
                }else{
                    expect(app).toEqual('failed-test');
                    done();
                }
            });
        });

        it("should create an app", function(done) {
            var appName = magnetId.v1();
            MMXManager.createApp(_user.email, _user.magnetId, {
                name : appName
            }, function(e, app){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    MMXManager.getApp(_user.magnetId, app.appId, function(e, response){
                        if(e){
                            expect(e).toEqual('failed-test2');
                            done();
                        }else{
                            expect(response.ownerId).toEqual(_user.magnetId);
                            expect(response.appId).toEqual(app.appId);
                            done();
                        }
                    });
                }
            });
        });

    });

    describe('getApps', function(){

        it("should get a list of apps", function(done) {
            MMXManager.getApps(_user.magnetId, function(e, apps){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(typeof apps).toEqual('object');
                    expect(apps.length).toBeGreaterThan(0);
                    var matches = Helper.getByAttr(apps, 'appId', _app.appId);
                    expect(matches.length).toEqual(1);
                    expect(matches[0].appId).toEqual(_app.appId);
                    done();
                }
            });
        });

    });

    describe('getStats', function(){

        it("should get stats across all apps", function(done) {
            MMXManager.getStats(_user.magnetId, function(e, stats){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    console.log(stats);
                    expect(typeof stats).toEqual('object');
                    expect(stats.length).toBeGreaterThan(0);
                    var matches = Helper.getByAttr(stats, 'appId', _app.appId);
                    expect(matches[0].inAppMessagesStats).not.toBeUndefined();
                    expect(matches[0].pushMessageStats).not.toBeUndefined();
                    expect(matches[0].deviceStats).not.toBeUndefined();
                    done();
                }
            });
        });

    });

    describe('getApp', function(){

        it("should get an app", function(done) {
            MMXManager.getApp(_user.magnetId, _app.appId, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.ownerId).toEqual(_user.magnetId);
                    expect(response.appId).toEqual(_app.appId);
                    done();
                }
            });
        });

    });

    describe('updateApp', function(){

        it("should fail to update an app given invalid body", function(done) {
            MMXManager.updateApp(_user.magnetId, true, _app.appId, null, function(e, app){
                if(e){
                    expect(e).toEqual('invalid-body');
                    done();
                }else{
                    expect(app).toEqual('failed-test');
                    done();
                }
            });
        });

        it("should update an app", function(done) {
            var appName = magnetId.v1();
            MMXManager.createApp(_user.email, _user.magnetId, {
                name : appName
            }, function(e, app){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(app.name).toEqual(appName);
                    var newApp = {
                        name : appName+'modified'
                    };
                    MMXManager.updateApp(_user.magnetId, true, _app.appId, newApp, function(e, response){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            expect(response.name).toEqual(newApp.name);
                            done();
                        }
                    });
                }
            });
        });

    });

    describe('deleteApp', function(){

        it("should delete an app", function(done) {
            var appName = magnetId.v1();
            MMXManager.createApp(_user.email, _user.magnetId, {
                name : appName
            }, function(e, app){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(app.name).toEqual(appName);
                    MMXManager.deleteApp(_user.magnetId, true, app.appId, function(e, response){
                        if(e){
                            expect(e).toEqual('failed-test2');
                            done();
                        }else{
                            MMXManager.getApp(_user.magnetId, app.appId, function(e, response){
                                if(e){
                                    expect(e).toEqual('App with supplied id not found.');
                                    done();
                                }else{
                                    expect(response).toEqual('failed-test3');
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });

    });

    describe('getAppMessages', function(){

        it("should get app messages", function(done) {
            MMXManager.getAppMessages(_user.magnetId, _app.appId, {}, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response).toEqual({ results : [  ], total : 0, offset : 0, size : 10 });
                    done();
                }
            });
        });

    });

    describe('getAppNotifications', function(){

        it("should fail given missing api key", function(done) {
            MMXManager.getAppNotifications(_user.magnetId, _app.appId, {}, {headers:{appapikey:''}}, function(e, response){
                if(e){
                    expect(e).toEqual('missing-apikey');
                    done();
                }else{
                    expect(response).toEqual('failed-test');
                    done();
                }
            });
        });

        it("should get app notifications", function(done) {
            MMXManager.getAppNotifications(_user.magnetId, _app.appId, {}, {headers:{appapikey:_app.appAPIKey}}, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response).toEqual({ results : [  ], total : 0, offset : 0, size : 100, active : null });
                    done();
                }
            });
        });

    });

    describe('getAppStats', function(){

        it("should get app stats", function(done) {
            MMXManager.getAppStats(_user.magnetId, _app.appId, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.inAppMessagesStats).not.toBeUndefined();
                    expect(response.pushMessageStats).not.toBeUndefined();
                    expect(response.deviceStats).not.toBeUndefined();
                    done();
                }
            });
        });

    });

    describe('getAppEndpoints', function(){

        it("should get app endpoints", function(done) {
            MMXManager.getAppEndpoints(_user.magnetId, _app.appId, {}, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response).toEqual({ results : [  ], total : 0, offset : 0, size : 10, active : 0 });
                    done();
                }
            });
        });

    });

    describe('getAppUsers', function(){

        it("should get app users", function(done) {
            MMXManager.getAppUsers(_user.magnetId, _app.appId, {}, {headers:{appapikey:_app.appAPIKey}}, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.results.length).toEqual(1);
                    expect(response.results[0].username).toEqual('serveruser');
                    done();
                }
            });
        });

    });

    describe('createAppUser', function(){

        it("should create an app user", function(done) {
            var user = {
                username : 'testuser',
                password : 'pass'
            }
            MMXManager.createAppUser(_user.magnetId, _app.appId, user, function(e, response, code){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(code).toEqual(201);
                    expect(response).toEqual('');
                    done();
                }
            });
        });

        it("should fail to create a duplicate app user", function(done) {
            var user = {
                username : 'testuser2',
                password : 'pass'
            }
            MMXManager.createAppUser(_user.magnetId, _app.appId, user, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    MMXManager.createAppUser(_user.magnetId, _app.appId, user, function(e, response){
                        if(e){
                            expect(e).toEqual('user-exists');
                            done();
                        }else{
                            expect(response).toEqual('failed-test');
                            done();
                        }
                    });
                }
            });
        });

    });

    describe('updateAppUser', function(){

        it("should update an app user", function(done) {
            var user = {
                username : 'testuser3',
                password : 'pass'
            }
            MMXManager.createAppUser(_user.magnetId, _app.appId, user, function(e, response, code){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(code).toEqual(201);
                    user.email = 'testuser3@magnet.com';
                    MMXManager.updateAppUser(_user.magnetId, _app.appId, user.username, user, function(e, response, code){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            expect(code).toEqual(200);
                            done();
                        }
                    });
                }
            });
        });

    });

    describe('deleteAppUser', function(){

        it("should delete an app user", function(done) {
            var user = {
                username : 'testuser4',
                password : 'pass'
            }
            MMXManager.createAppUser(_user.magnetId, _app.appId, user, function(e, response, code){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(code).toEqual(201);
                    MMXManager.deleteAppUser(_user.magnetId, _app.appId, user.username, function(e, response, code){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            expect(code).toEqual(200);
                            done();
                        }
                    });
                }
            });
        });

    });

    describe('getAppUserDevices', function(){

        it("should get app user devices", function(done) {
            var user = {
                username : 'testuser5',
                password : 'pass'
            }
            MMXManager.createAppUser(_user.magnetId, _app.appId, user, function(e, response, code){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(code).toEqual(201);
                    MMXManager.getAppUserDevices(_user.magnetId, _app.appId, user.username, function(e, response, code){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            expect(response).toEqual({ results : [  ], total : 0, offset : 0, size : 10, active : 0 });
                            done();
                        }
                    });
                }
            });
        });

    });

});


