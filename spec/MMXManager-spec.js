var MMXManager = require("../lib/MMXManager")
, UserManager = require('../lib/UserManager')
, ConfigManager = require('../lib/ConfigManager')
, Helper = require('./Helper')
, orm = require('../lib/orm')
, fs = require('fs')
, sinon = require('sinon')
, mysql = require('mysql')
, magnetId = require('node-uuid')
, _ = require('underscore');

jasmine.getEnv().defaultTimeoutInterval = 15000;

xdescribe('MMXManager', function(){

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
        if(process.env.TEST_ENV == 'jenkins'){
            ENV_CONFIG.DatabaseLog.enabled = false;
            var connection =  mysql.createConnection({
                host     : ENV_CONFIG.Database.host,
                port     : ENV_CONFIG.Database.port,
                user     : ENV_CONFIG.Database.username,
                password : ENV_CONFIG.Database.password
            });
            // drop database
            connection.query('DROP DATABASE IF EXISTS '+ENV_CONFIG.Database.dbName+';', function(e){
                if(e){
                    expect(e).toEqual('failed-test');
                    return done();
                }
                // create new database
                connection.query('CREATE DATABASE IF NOT EXISTS '+ENV_CONFIG.Database.dbName+';', function(e){
                    if(e){
                        expect(e).toEqual('failed-test2');
                        return done();
                    }
                    // set up database schema
                    orm.setup('./lib/models', function(){
                        var bootstrapConfig = {
                            host : 'localhost',
                            user : 'admin',
                            password : 'admin',
                            shareDB : true,
                            mysqlHost : 'localhost',
                            mysqlPort : 3306,
                            mysqlDb : 'magnetmessagedb',
                            mysqlUser : 'root',
                            mysqlPassword : '',
                            xmppDomain : 'mmx'
                        };
                        // provision messaging server
                        ConfigManager.bootstrapMessaging(bootstrapConfig, function(e){
                            if(e){
                                expect(e).toEqual('failed-test3');
                                done();
                            }else{
                                // poll to make sure messaging server is provisioned
                                Helper.checkMessagingStatus(null, function(e){
                                    if(e){
                                        expect(e).toEqual('failed-test4');
                                        done();
                                    }else{
                                        // create test user
                                        UserManager.create(_user, function(e, newUser){
                                            expect(e).toBeNull();
                                            _user = newUser;
                                            var appName = magnetId.v1();
                                            // create test app for the user
                                            MMXManager.createApp(_user.email, _user.magnetId, {
                                                name : appName
                                            }, function(e, app){
                                                if(e){
                                                    expect(e).toEqual('failed-test5');
                                                    done();
                                                }else{
                                                    _app = app;
                                                    done();
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    });
                });
            });
        }else{
//            ENV_CONFIG.MMX.host = 'citest01.magneteng.com';
//            ENV_CONFIG.MMX.user = 'admin';
//            ENV_CONFIG.MMX.password = 'test';
//            ENV_CONFIG.MMX.webPort = 9090;
//            ENV_CONFIG.MMX.publicPort = 5220;
//            ENV_CONFIG.MMX.adminPort = 7070;
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
        }
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
                    expect(matches.length).toBeGreaterThan(0);
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

    // TODO: missing device apis, need a way to create a device in db

    describe('createAppTopic', function(){

        it("should create an app topic", function(done) {
            var topic = {
                name        : 'testtopic',
                description : 'testdesc'
            }
            MMXManager.createAppTopic(_user.magnetId, _app.appId, topic, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.name).toEqual(topic.name);
                    expect(response.description).toEqual(topic.description);
                    done();
                }
            });
        });

    });

    describe('getAppTopics', function(){

        it("should return a list of topics", function(done) {
            MMXManager.getAppTopics(_user.magnetId, _app.appId, {}, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.total).toBeGreaterThan(0);
                    expect(response.size).toEqual(100);
                    expect(response.offset).toEqual(0);
                    expect(response.results.length).toBeGreaterThan(0);
                    done();
                }
            });
        });

    });

    describe('deleteAppTopic', function(){

        it("should delete an app topic", function(done) {
            var topic = {
                name        : 'testtopic2',
                description : 'testdesc2'
            }
            MMXManager.createAppTopic(_user.magnetId, _app.appId, topic, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.name).toEqual(topic.name);
                    expect(response.description).toEqual(topic.description);
                    MMXManager.deleteAppTopic(_user.magnetId, _app.appId, response.id, function(e, response, code){
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

    describe('addTopicTags', function(){

        it("should fail given missing api key", function(done) {
            MMXManager.addTopicTags(_user.magnetId, _app.appId, null, null, {headers:{appapikey:''}}, function(e, response){
                if(e){
                    expect(e).toEqual('missing-apikey');
                    done();
                }else{
                    expect(response).toEqual('failed-test');
                    done();
                }
            });
        });

        it("should add tags to a topic", function(done) {
            var topic = {
                name        : 'testtopic3',
                description : 'testdesc3'
            }
            MMXManager.createAppTopic(_user.magnetId, _app.appId, topic, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.name).toEqual(topic.name);
                    expect(response.description).toEqual(topic.description);
                    var tag1 = 'tag1';
                    var tag2 = 'tag2';
                    var topicTagBody = {"topicId":response.id,"tags":[tag1, tag2]};
                    MMXManager.addTopicTags(_user.magnetId, _app.appId, response.id, topicTagBody, {headers:{appapikey:_app.appAPIKey}}, function(e, topicTagResponse, code){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            expect(code).toEqual(201);
                            MMXManager.getAppTopics(_user.magnetId, _app.appId, {}, function(e, topicList){
                                if(e){
                                    expect(e).toEqual('failed-test');
                                    done();
                                }else{
                                    expect(topicList.total).toBeGreaterThan(0);
                                    expect(topicList.size).toEqual(100);
                                    expect(topicList.offset).toEqual(0);
                                    expect(topicList.results.length).toBeGreaterThan(0);
                                    var topics = Helper.getByAttr(topicList.results, 'id', response.id);
                                    expect(topics.length).toEqual(1);
                                    expect(topics[0].tags.length).toEqual(2);
                                    expect(topics[0].tags[0]).toEqual(tag1);
                                    expect(topics[0].tags[1]).toEqual(tag2);
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });

    });

    describe('removeTopicTags', function(){

        it("should fail given missing api key", function(done) {
            MMXManager.removeTopicTags(_user.magnetId, _app.appId, null, null, {headers:{appapikey:''}}, function(e, response){
                if(e){
                    expect(e).toEqual('missing-apikey');
                    done();
                }else{
                    expect(response).toEqual('failed-test');
                    done();
                }
            });
        });

        it("should remove tags from a topic", function(done) {
            var topic = {
                name        : 'testtopic4',
                description : 'testdesc4'
            }
            MMXManager.createAppTopic(_user.magnetId, _app.appId, topic, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.name).toEqual(topic.name);
                    expect(response.description).toEqual(topic.description);
                    var tag1 = 'tag1';
                    var tag2 = 'tag2';
                    var tag3 = 'tag3';
                    var tag4 = 'tag4';
                    var tag5 = 'tag5';
                    var topicTagBody = {"topicId":response.id,"tags":[tag1, tag2, tag3, tag4, tag5]};
                    MMXManager.addTopicTags(_user.magnetId, _app.appId, response.id, topicTagBody, {headers:{appapikey:_app.appAPIKey}}, function(e, topicTagResponse, code){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            expect(code).toEqual(201);
                            var removeTopicTagBody = {"topicId":response.id,"tags":[tag2, tag4]};
                            MMXManager.removeTopicTags(_user.magnetId, _app.appId, response.id, removeTopicTagBody, {headers:{appapikey:_app.appAPIKey}}, function(e, topicTagResponse, code){
                                if(e){
                                    expect(e).toEqual('failed-test');
                                    done();
                                }else{
                                    expect(code).toEqual(200);
                                    MMXManager.getAppTopics(_user.magnetId, _app.appId, {}, function(e, topicList){
                                        if(e){
                                            expect(e).toEqual('failed-test');
                                            done();
                                        }else{
                                            expect(topicList.total).toBeGreaterThan(0);
                                            expect(topicList.size).toEqual(100);
                                            expect(topicList.offset).toEqual(0);
                                            expect(topicList.results.length).toBeGreaterThan(0);
                                            var topics = Helper.getByAttr(topicList.results, 'id', response.id);
                                            expect(topics.length).toEqual(1);
                                            expect(topics[0].tags.length).toEqual(3);
                                            expect(topics[0].tags[0]).toEqual(tag1);
                                            expect(topics[0].tags[1]).toEqual(tag3);
                                            expect(topics[0].tags[2]).toEqual(tag5);
                                            done();
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });

    });

    describe('publishToTopic', function(){

        it("should publish to a topic", function(done) {
            var topic = {
                name        : 'testtopic5',
                description : 'testdesc5'
            }
            MMXManager.createAppTopic(_user.magnetId, _app.appId, topic, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.name).toEqual(topic.name);
                    expect(response.description).toEqual(topic.description);
                    var payload = {
                        payload : 'a test message'
                    };
                    MMXManager.publishToTopic(_user.magnetId, _app.appId, response.id, payload, function(e, publishResponse, code){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            expect(code).toEqual(200);
                            expect(publishResponse.status).toEqual('OK');
                            expect(publishResponse.messageId).not.toBeUndefined();
                            done();
                        }
                    });
                }
            });
        });

    });

    describe('getConfigs', function(){

        it("should get app configration", function(done) {
            MMXManager.getConfigs(_user.magnetId, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(typeof response.configs).toEqual('object');
                    expect(response.configs['mmx.alert.email.subject']).toEqual('Usage limit exceeded');
                    done();
                }
            });
        });

    });

    describe('setConfigs', function(){

        it("should set app configration", function(done) {
            MMXManager.getConfigs(_user.magnetId, function(e, originalResponse){
                if(e){
                    expect(e).toEqual('failed-test1');
                    done();
                }else{
                    expect(typeof originalResponse.configs).toEqual('object');
                    var newValue = '23';
                    var config = {
                        configs : {
                            'mmx.retry.interval.minutes' : newValue
                        }
                    };
                    MMXManager.setConfigs(config, function(e, response){
                        if(e){
                            expect(e).toEqual('failed-test2');
                            done();
                        }else{
                            MMXManager.getConfigs(_user.magnetId, function(e, updatedResponse){
                                if(e){
                                    expect(e).toEqual('failed-test');
                                    done();
                                }else{
                                    expect(typeof updatedResponse.configs).toEqual('object');
                                    expect(updatedResponse.configs['mmx.retry.interval.minutes']).toEqual(newValue);
                                    config = {
                                        configs : {
                                            'mmx.retry.interval.minutes' : originalResponse.configs['mmx.retry.interval.minutes']
                                        }
                                    };
                                    MMXManager.setConfigs(config, function(e, response){
                                        if(e){
                                            expect(e).toEqual('failed-test3');
                                            done();
                                        }else{
                                            MMXManager.getConfigs(_user.magnetId, function(e, confirmResponse){
                                                if(e){
                                                    expect(e).toEqual('failed-test4');
                                                    done();
                                                }else{
                                                    expect(typeof confirmResponse.configs).toEqual('object');
                                                    expect(confirmResponse.configs['mmx.retry.interval.minutes']).toEqual(originalResponse.configs['mmx.retry.interval.minutes']);
                                                    done();
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });

    });

    describe('getServerStatus', function(){

        it('should return server status', function(done){
            MMXManager.getServerStatus(null, function(e, response, code){
                if(e){
                    expect(e).toEqual('failed-test4');
                    done();
                }else{
                    expect(typeof response).toEqual('object');
                    expect(response.setupComplete).toEqual(true);
                    expect(code).toEqual(200);
                    done();
                }
            });
        });

        it('should fail given invalid server config', function(done){
            var config = {
                "shareDB": true,
                "host": "noexist",
                "ssl": false,
                "webPort": 9090,
                "publicPort": 5220,
                "adminPort": 6060,
                "user": "admin",
                "password": "admin"
            }
            MMXManager.getServerStatus(config, function(e, response, code){
                if(e){
                    expect(e).toEqual('connect-error');
                    expect(code).toEqual(400);
                    done();
                }else{
                    expect(response).toEqual('failed-test');
                    done();
                }
            });
        });

    });

    describe('provisionServer', function(){

        it('should return 200 if server already provisioned', function(done){
            var provisionPayload = {
                'dbHost'     : 'localhost',
                'dbPort'     : 3306,
                'dbName'     : 'anotherDB',
                'dbUser'     : 'root',
                'dbPassword' : '',
                'xmppDomain' : 'mmx'
            };
            MMXManager.provisionServer(null, provisionPayload, function(e, response, code){
                if(e){
                    expect(response).toEqual('failed-test');
                    done();
                }else{
                    expect(code).toEqual(200);
                    done();
                }
            });
        });

        it('should return 400 if server doesnt exist', function(done){
            var config = {
                "shareDB": true,
                "host": "noexist",
                "ssl": false,
                "webPort": 9090,
                "publicPort": 5220,
                "adminPort": 6060,
                "user": "admin",
                "password": "admin"
            };
            var provisionPayload = {
                'dbHost'     : 'localhost',
                'dbPort'     : 3306,
                'dbName'     : 'anotherDB',
                'dbUser'     : 'root',
                'dbPassword' : '',
                'xmppDomain' : 'mmx'
            };
            MMXManager.provisionServer(config, provisionPayload, function(e, response, code){
                if(e){
                    expect(e).toEqual('connect-error');
                    expect(code).toEqual(400);
                    done();
                }else{
                    expect(response).toEqual('failed-test');
                    done();
                }
            });
        });

    });

    describe('storeAPNSCertificate', function(){

        it('should upload an APNS certificate', function(done){
            MMXManager.getApp(_user.magnetId, _app.appId, function(e, response){
                if(e){
                    expect(e).toEqual('failed-test');
                    done();
                }else{
                    expect(response.apnsCertUploaded).toEqual(false);
                    var filename = 'APNSTestDevelopmentCertificate.p12';
                    var fileStats = fs.statSync('./specfiles/'+filename);
                    var fileSize = fileStats['size'];
                    expect(fileSize).toEqual(3223);
                    var apnsCertStream = fs.createReadStream('./specfiles/'+filename);
                    apnsCertStream.header = function(header){
                        if(header == 'x-file-name') return filename;
                        if(header == 'x-file-type') return 'application/x-pkcs12';
                    };
                    MMXManager.storeAPNSCertificate(_user.magnetId, _app.appId, apnsCertStream, function(e, response, code){
                        if(e){
                            expect(response).toEqual('failed-test');
                            done();
                        }else{
                            expect(e).toEqual(null);
                            expect(response).toEqual('');
                            expect(code).toEqual(200);
                            MMXManager.getApp(_user.magnetId, _app.appId, function(e, response){
                                if(e){
                                    expect(e).toEqual('failed-test');
                                    done();
                                }else{
                                    expect(response.apnsCertUploaded).toEqual(true);
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });

    });

    describe('deleteAPNSCertificate', function(){

        it('should delete an APNS deleteAPNSCertificate', function(done){
            var appName = magnetId.v1();
            MMXManager.createApp(_user.email, _user.magnetId, {
                name : appName
            }, function(e1, app){
                if(e1){
                    expect(e1).toEqual('failed-test');
                    done();
                }else{
                    expect(app.apnsCertUploaded).toEqual(false);
                    var filename = 'APNSTestDevelopmentCertificate.p12';
                    var fileStats = fs.statSync('./specfiles/'+filename);
                    var fileSize = fileStats['size'];
                    expect(fileSize).toEqual(3223);
                    var apnsCertStream = fs.createReadStream('./specfiles/'+filename);
                    apnsCertStream.header = function(header){
                        if(header == 'x-file-name') return filename;
                        if(header == 'x-file-type') return 'application/x-pkcs12';
                    };
                    MMXManager.storeAPNSCertificate(_user.magnetId, app.appId, apnsCertStream, function(e2, response2, code2){
                        if(e2){
                            expect(response2).toEqual('failed-test');
                            done();
                        }else{
                            expect(e2).toEqual(null);
                            expect(response2).toEqual('');
                            expect(code2).toEqual(200);
                            MMXManager.getApp(_user.magnetId, _app.appId, function(e3, response3){
                                if(e3){
                                    expect(e3).toEqual('failed-test');
                                    done();
                                }else{
                                    expect(response3.apnsCertUploaded).toEqual(true);
                                    MMXManager.deleteAPNSCertificate(_user.magnetId, app.appId, function(e4, response4, code4){
                                        if(e4){
                                            expect(response4).toEqual('failed-test');
                                            done();
                                        }else{
                                            expect(e4).toEqual(null);
                                            expect(response4).toEqual('');
                                            expect(code4).toEqual(200);
                                            MMXManager.getApp(_user.magnetId, app.appId, function(e5, response5){
                                                if(e5){
                                                    expect(e5).toEqual('failed-test');
                                                    done();
                                                }else{
                                                    expect(response5.apnsCertUploaded).toEqual(false);
                                                    done();
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });

    });

});


