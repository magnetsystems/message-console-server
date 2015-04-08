var ConfigManager = require("../lib/ConfigManager")
 , Helper = require('./Helper')
 , orm = require('../lib/orm')
, fs = require('fs')
, sinon = require('sinon')
, mysql = require('mysql')
, magnetId = require('node-uuid')
, _ = require('underscore');

jasmine.getEnv().defaultTimeoutInterval = 5000;

var configStatic = Helper.deepCopy(require('../lib/config/config.json'));

describe('ConfigManager', function(){

    beforeAll(function(done){
        ENV_CONFIG.DatabaseLog.enabled = false;
        var connection =  mysql.createConnection({
            host     : ENV_CONFIG.Database.host,
            port     : ENV_CONFIG.Database.port,
            user     : ENV_CONFIG.Database.username,
            password : ENV_CONFIG.Database.password
        });
        connection.query('CREATE DATABASE IF NOT EXISTS '+ENV_CONFIG.Database.dbName+';', function(e){
            if(e){
                expect(e).toEqual('failed-test');
            }
            orm.setup('./lib/models', function(){
                done();
            });
        });
    });

    var mmxManagerStub = {
        getServerStatus : function(obj, cb){
            cb(null, {"setupComplete":true,"mmxAdminPort":"6060","mmxAdminPortSecure":"6061","mmxPublicPort":"5220","mmxPublicPortSecure":"5221"}, 200);
        },
        getConfigs : function(section, cb){
            cb(null, {});
        },
        provisionServer: function(connect, config, cb){
            cb(null, 'test-status', 201);
        }
    };

    var fsStub  = {
        readFile: function(configPath, encoding, cb){
            cb(null, {});
        },
        readFileSync: function(configPath, encoding){
            if(configPath == './lib/config/auth.json')
                return {
                    email    : 'sysadmin@company.com',
                    password : 'admin'
                };
            if(configPath == './lib/config/config.json')
                return JSON.stringify(Helper.deepCopy(configStatic));
        },
        writeFile: function(configPath, str, cb){
            (cb || function(){})();
        }
    };

    var redisClientStub = function(){
        this.evts = {};
        this.auth = function(password){
        };
        this.on = function(evt, cb){
            this.evts[evt] = cb;
        };
        this.get = function(tag, cb){
            if(tag == 'redis-init')
                this.evts['connect'](null, this);
            else
                cb(null, JSON.stringify(Helper.deepCopy(configStatic)));
        }
        this.set = function(tag, cfg, cb){
            cb();
        }
    };
    var redisStub = {
        createClient: function(port, host){
            return new redisClientStub();
        }
    };

    describe('init', function(){

        beforeAll(function(done){
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        beforeEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            done();
        });

        it("should callback if server is not configured", function(done) {
            ConfigManager.configs.App.configured = false;
            ConfigManager.init(function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        it("should callback if server is configured", function(done) {
            ConfigManager.configs.App.configured = true;
            ConfigManager.init(function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        it("should fail to connect if redis not available", function(done) {
            ConfigManager.configs.App.configured = true;
            ConfigManager.configs.Redis.enabled = true;
            ConfigManager.init(function(e){
                expect(e).toEqual('connect-error');
                done();
            });
        });

        it("should connect if redis available", function(done) {
            ConfigManager.configs.App.configured = true;
            ConfigManager.configs.Redis.enabled = true;
            ConfigManager.define(fsStub, null, redisStub, null, mmxManagerStub);
            ConfigManager.init(function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        it("should connect and storeConfig", function(done) {
            ConfigManager.configs.App.configured = true;
            ConfigManager.configs.Redis.enabled = true;
            ConfigManager.configs.Redis.storeConfig = true;
            ConfigManager.define(fsStub, null, redisStub, null, mmxManagerStub);
            ConfigManager.init(function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        afterAll(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

    });

    describe('initComplete', function(){

        it("should connect to messaging server", function(done) {
            ConfigManager.initComplete(function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

    });

    describe('get', function(){

        it("should obtain cached config", function(done) {
            ConfigManager.configs.Redis.enabled = false;
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            ConfigManager.get('App', function(e, config){
                expect(e).toBeNull();
                expect(config.port).toEqual(3000);
                done();
            }, true);
        });

        it("should obtain redis config", function(done) {
            ConfigManager.configs.App.configured = true;
            ConfigManager.configs.Redis.enabled = true;
            ConfigManager.configs.Redis.storeConfig = true;
            ConfigManager.define(fsStub, null, redisStub, null, mmxManagerStub);
            ConfigManager.get('App', function(e, config){
                expect(e).toBeNull();
                expect(config.port).toEqual(3000);
                done();
            });
        });

    });

    describe('retrieveLocal', function(){

        it("should return config", function(done) {
            var config = ConfigManager.retrieveLocal();
            expect(config.App.port).toEqual(3000);
            done();
        });

        it("should obtain redis config", function(done) {
            var fsStubInst = Helper.deepCopy(fsStub);
            fsStubInst.readFileSync = function(){
                throw 'test-error';
            };
            ConfigManager.define(fsStubInst, null, null, null, mmxManagerStub);
            expect(function(){ConfigManager.retrieveLocal()}).toThrow();
            done();
        });

        afterAll(function(done){
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

    });

    describe('set', function(){

        beforeEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            done();
        });

        it("should fail given invalid feature", function(done) {
            ConfigManager.set('invalid', {
                'foo' : 'bar'
            }, function(e){
                expect(e).toEqual('invalid-feature');
                done();
            });
        });

        it("should fail given invalid data types", function(done) {
            ConfigManager.set('App', {
                'port' : 'should-be-int'
            }, function(e){
                expect(e).toEqual([ 'port' ]);
                done();
            });
        });

    });

    describe('storeLocal', function(){

        beforeEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            done();
        });

        it("should fail given invalid feature", function(done) {
            var fsStubInst = {
                writeFile: function(configPath, str, cb){
                    cb('test-error');
                }
            };
            ConfigManager.define(fsStubInst, null, null, null, mmxManagerStub);
            ConfigManager.storeLocal(function(e){
                expect(e).toEqual('save-error');
                done();
            });
        });

        it("should set config after storing", function(done) {
            expect(ENV_CONFIG.App.port).toEqual(3000);
            ConfigManager.configs.App.port = 3001;
            ConfigManager.storeLocal(function(e){
                expect(ConfigManager.configs.App.port).toEqual(3001);
                done();
            });
        });

        afterAll(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

    });

    describe('setDB', function(){

        it("should fail if missing a required db config", function(done) {
            var obj = {
                dbName   : 'mydb',
//                host     : 'localhost',
                username : 'foo',
                port     : 3306
            };
            ConfigManager.setDB(obj, function(e){
                expect(e).toEqual('connect-error');
                done();
            });
        });

        it("should fail if unable to connect to db", function(done) {
            var obj = {
                dbName   : 'mydb',
                host     : 'invalid-host',
                username : 'foo',
                port     : 3306
            };
            ConfigManager.setDB(obj, function(e){
                expect(e).toEqual('ENOTFOUND');
                done();
            });
        });

        it("should fail to connect given incorrect credentials", function(done) {
            var obj = {
                dbName   : 'magnetmessagedb',
                host     : 'localhost',
                username : 'nonexist-user',
                port     : 3306
            };
            ConfigManager.setDB(obj, function(e){
                expect(e).toContain('ACCESS_DENIED_ERROR');
                done();
            });
        });

        it("should connect given valid db info", function(done) {
            var obj = {
                dbName   : 'magnetmessagedb',
                host     : 'localhost',
                username : 'root',
                port     : 3306
            };
            ConfigManager.setDB(obj, function(e){
                expect(e).toEqual('DB_ALREADY_EXISTS');
                done();
            });
        });

        it("should create db if createDatabase flag set true", function(done) {
            var dbName = 'test'+(magnetId.v1().replace(/-/g, ''));
            var obj = {
                dbName   : dbName,
                host     : 'localhost',
                username : 'root',
                password : '',
                port     : 3306,
                createDatabase : true
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            ConfigManager.setDB(obj, function(e){
                expect(e).toBeUndefined();
                var connection =  mysql.createConnection({
                    host     : obj.host,
                    por      : obj.port,
                    user     : obj.username,
                    password : obj.password
                });
                connection.query('DROP DATABASE '+dbName+';', function(e){
                    if(e){
                        expect(e).toEqual('failed-test');
                    }
                    done();
                });
            });
        });

        afterAll(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            configStatic.Database.createDatabase = true;
            ConfigManager.setDB(configStatic.Database, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

    });

    describe('setAdmin', function(){

        var email = magnetId.v4()+'@magnet.com';

        it("should fail if missing a required admin config", function(done) {
            var obj = {
//                email   : 'mydb',
                password : 'pass'
            };
            ConfigManager.setAdmin(obj, function(e){
                expect(e).toEqual('missing-fields');
                done();
            });
        });

        it("should create admin user", function(done) {
            var obj = {
                email: email,
                password : 'pass'
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            ConfigManager.setAdmin(obj, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        it("should fail to authorize an existing admin user with incorrect creds", function(done) {
            var obj = {
                email: email,
                password : 'passinvalid'
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            ConfigManager.setAdmin(obj, function(e){
                expect(e).toEqual('invalid-login');
                done();
            });
        });

        it("should authorize an existing admin user", function(done) {
            var obj = {
                email: email,
                password : 'pass'
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            ConfigManager.setAdmin(obj, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        afterAll(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

    });

    describe('bootstrapMessaging', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should fail if missing required params", function(done) {
            var obj = {
//                shareDB  : true,
                host     : 'localhost',
                user     : 'foo',
                password : 'pass',
                port     : 3306
            };
            ConfigManager.bootstrapMessaging(obj, function(e){
                expect(e).toEqual('missing-fields');
                done();
            });
        });

        it("should complete without error with skipProvisioning enabled", function(done) {
            var obj = {
                shareDB  : true,
                host     : 'anotherHost',
                user     : 'foo',
                port     : 3306,
                password : 'pass',
                skipProvisioning : true
            };
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb(null, {"setupComplete":true,"mmxAdminPort":"9090","mmxAdminPortSecure":"6061","mmxPublicPort":"8080","mmxPublicPortSecure":"5221"}, 200);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            expect(ConfigManager.configs.MMX.publicPort).toEqual(5220);
            expect(ConfigManager.configs.MMX.adminPort).toEqual(6060);
            expect(ConfigManager.configs.Geologging.host).toEqual('localhost');
            ConfigManager.bootstrapMessaging(obj, function(e){
                expect(e).toBeUndefined();
                expect(ConfigManager.configs.MMX.publicPort).toEqual(8080);
                expect(ConfigManager.configs.MMX.adminPort).toEqual(9090);
                expect(ConfigManager.configs.Geologging.host).toEqual('anotherHost');
                done();
            });
        });

        it("should fail if bootstrap api was not found", function(done) {
            var obj = {
                shareDB  : true,
                host     : 'anotherHost',
                user     : 'foo',
                port     : 3306,
                password : 'pass',
                skipProvisioning : false
            };
            var mmxManagerStubInst = {
                provisionServer: function(connect, config, cb){
                    cb(null, 'test-status', 404);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            ConfigManager.bootstrapMessaging(obj, function(e){
                expect(e).toEqual('not-found');
                done();
            });
        });

        it("should fail if unable to auth with mmx server", function(done) {
            var obj = {
                shareDB  : true,
                host     : 'anotherHost',
                user     : 'foo',
                port     : 3306,
                password : 'pass',
                skipProvisioning : false
            };
            var mmxManagerStubInst = {
                provisionServer: function(connect, config, cb){
                    cb(null, 'test-status', 401);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            ConfigManager.bootstrapMessaging(obj, function(e){
                expect(e).toEqual('auth-failure');
                done();
            });
        });

        it("should return status if status code was not caught", function(done) {
            var obj = {
                shareDB  : true,
                host     : 'anotherHost',
                user     : 'foo',
                port     : 3306,
                password : 'pass',
                skipProvisioning : false
            };
            var mmxManagerStubInst = {
                provisionServer: function(connect, config, cb){
                    cb(null, 'test-status', 500);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            ConfigManager.bootstrapMessaging(obj, function(e){
                expect(e).toEqual('test-status');
                done();
            });
        });

        it("should complete without error with skipProvisioning disabled", function(done) {
            var obj = {
                shareDB  : true,
                host     : 'anotherHost',
                user     : 'foo',
                port     : 3306,
                password : 'pass',
                skipProvisioning : false
            };
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb(null, {"setupComplete":true,"mmxAdminPort":"9090","mmxAdminPortSecure":"6061","mmxPublicPort":"8080","mmxPublicPortSecure":"5221"}, 200);
                },
                provisionServer: function(connect, config, cb){
                    cb(null, 'test-status', 201);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            expect(ConfigManager.configs.MMX.publicPort).toEqual(5220);
            expect(ConfigManager.configs.MMX.adminPort).toEqual(6060);
            expect(ConfigManager.configs.Geologging.host).toEqual('localhost');
            ConfigManager.bootstrapMessaging(obj, function(e){
                expect(e).toBeUndefined();
                expect(ConfigManager.configs.MMX.publicPort).toEqual(8080);
                expect(ConfigManager.configs.MMX.adminPort).toEqual(9090);
                expect(ConfigManager.configs.Geologging.host).toEqual('anotherHost');
                done();
            });
        });

    });

    describe('bootstrapMessagingComplete', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should fail if mmx credentials were incorrect", function(done) {
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb(null, {}, 401);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            var obj = {
                shareDB  : true,
                host     : 'localhost',
                user     : 'foo',
                port     : 3306
            };
            ConfigManager.bootstrapMessagingComplete(obj, true, function(e){
                expect(e).toEqual('auth-failure');
                done();
            });
        });

        it("should fail if status code is not 200", function(done) {
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb('test-error', {}, 201);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            var obj = {
                shareDB  : true,
                host     : 'localhost',
                user     : 'foo',
                port     : 3306
            };
            ConfigManager.bootstrapMessagingComplete(obj, true, function(e){
                expect(e).toEqual('test-error');
                done();
            });
        });

        it("should complete without error", function(done) {
            var obj = {
                shareDB  : true,
                host     : 'anotherHost',
                user     : 'foo',
                port     : 3306
            };
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb(null, {"setupComplete":true,"mmxAdminPort":"9090","mmxAdminPortSecure":"6061","mmxPublicPort":"8080","mmxPublicPortSecure":"5221"}, 200);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            expect(ConfigManager.configs.MMX.publicPort).toEqual(5220);
            expect(ConfigManager.configs.MMX.adminPort).toEqual(6060);
            expect(ConfigManager.configs.Geologging.host).toEqual('localhost');
            ConfigManager.bootstrapMessagingComplete(obj, true, function(e){
                expect(e).toBeUndefined();
                expect(ConfigManager.configs.MMX.publicPort).toEqual(8080);
                expect(ConfigManager.configs.MMX.adminPort).toEqual(9090);
                expect(ConfigManager.configs.Geologging.host).toEqual('anotherHost');
                done();
            });
        });

    });


    describe('setMessaging', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should fail if mmx credentials were incorrect", function(done) {
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb(null, {}, 401);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            var obj = {
                "host": "localhost",
                "ssl": false,
                "webPort": 9090,
                "user": "admin",
                "password": "admin"
            };
            ConfigManager.setMessaging(obj, function(e){
                expect(e).toEqual('auth-failure');
                done();
            });
        });

        it("should fail if status was not 200", function(done) {
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb('unknown-error', {}, 500);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            var obj = {
                "host": "localhost",
                "ssl": false,
                "webPort": 9090,
                "user": "admin",
                "password": "admin"
            };
            ConfigManager.setMessaging(obj, function(e){
                expect(e).toEqual('unknown-error');
                done();
            });
        });

        it("should fail if mmx server not bootstrapped", function(done) {
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb(null, {"setupComplete":false}, 200);
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            var obj = {
                "host": "localhost",
                "ssl": false,
                "webPort": 9090,
                "user": "admin",
                "password": "admin"
            };
            ConfigManager.setMessaging(obj, function(e){
                expect(e).toEqual('not-provisioned');
                done();
            });
        });

        it("should fail if unable to get mmx configs", function(done) {
            var mmxManagerStubInst = {
                getServerStatus : function(obj, cb){
                    cb(null, {"setupComplete":true,"mmxAdminPort":"6060","mmxAdminPortSecure":"6061","mmxPublicPort":"5220","mmxPublicPortSecure":"5221"}, 200);
                },
                getConfigs : function(section, cb){
                    cb('test-error', {});
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            var obj = {
                "host": "localhost",
                "ssl": false,
                "webPort": 9090,
                "user": "admin",
                "password": "admin"
            };
            ConfigManager.setMessaging(obj, function(e){
                expect(e).toEqual('test-error');
                done();
            });
        });

        it("should successfully bootstrap mmx server", function(done) {
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            var obj = {
                "host": "localhost",
                "ssl": false,
                "webPort": 9090,
                "user": "admin",
                "password": "admin"
            };
            ConfigManager.setMessaging(obj, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

    });

    describe('setRedis', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should fail to setup redis if missing fields", function(done) {
            var obj = {
//                host: 'localhost',
                port: 6379
            };
            ConfigManager.setRedis(obj, function(e){
                expect(e).toEqual('missing-fields');
                done();
            });
        });

        it("should be able to disable redis", function(done) {
            var obj = {
                host: 'localhost',
                port: 6379,
                enabled: false
            };
            ConfigManager.redis = {};
            expect(ConfigManager.redis).not.toBeUndefined();
            ConfigManager.setRedis(obj, function(e){
                expect(e).toBeUndefined();
                expect(ConfigManager.redis).toBeUndefined();
                done();
            });
        });

        it("should fail connect to redis if redis not running", function(done) {
            var obj = {
                host: 'localhost',
                port: 6379,
                enabled: true
            };
            ConfigManager.setRedis(obj, function(e){
                expect(e).toEqual('connect-error');
                expect(ConfigManager.redis).toBeUndefined();
                expect(ConfigManager.configs.Redis.enabled).toEqual(false);
                done();
            });
        });

        it("should connect to redis", function(done) {
            var obj = {
                host: 'localhost',
                port: 6379,
                enabled: true
            };
            ConfigManager.define(fsStub, null, redisStub, null, mmxManagerStub);
            delete ConfigManager.redis;
            expect(ConfigManager.redis).toBeUndefined();
            expect(ConfigManager.configs.Redis.enabled).toEqual(false);
            ConfigManager.setRedis(obj, function(e){
                expect(e).toBeUndefined();
                expect(ConfigManager.redis).not.toBeUndefined();
                expect(ConfigManager.configs.Redis.enabled).toEqual(true);
                done();
            });
        });

        it("should connect to redis and store config", function(done) {
            var obj = {
                host: 'localhost',
                port: 6379,
                enabled: true,
                storeConfig:true
            };
            ConfigManager.define(fsStub, null, redisStub, null, mmxManagerStub);
            delete ConfigManager.redis;
            expect(ConfigManager.redis).toBeUndefined();
            expect(ConfigManager.configs.Redis.enabled).toEqual(false);
            ConfigManager.setRedis(obj, function(e){
                expect(e).toBeUndefined();
                expect(ConfigManager.redis).not.toBeUndefined();
                expect(ConfigManager.configs.Redis.enabled).toEqual(true);
                done();
            });
        });

    });

    describe('setRedisComplete', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should fail to set redis config", function(done) {
            var obj = {
                host: 'localhost',
                port: 6379,
                enabled: true,
                storeConfig:true
            };
            var fsStubInst = {
                writeFile: function(configPath, str, cb){
                    cb('test-error');
                }
            };
            ConfigManager.define(fsStubInst, null, null, null, mmxManagerStub);
            ConfigManager.setRedisComplete(obj, function(e){
                expect(e).toEqual('connect-error');
                done();
            });
        });

        it("should set redis config", function(done) {
            var obj = {
                host: 'localhost',
                port: 6379,
                enabled: true,
                storeConfig:true
            };
            ConfigManager.setRedisComplete(obj, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

    });

    describe('completeInstall', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should set configured flag to true", function(done) {
            expect(ConfigManager.configs.App.configured).toEqual(false);
            ConfigManager.completeInstall(function(e){
                expect(ConfigManager.configs.App.configured).toEqual(true);
                done();
            });
        });

    });

    describe('getConfigs', function(){

        it("should return all configs", function(done) {
            ConfigManager.getConfigs(function(e, configs){
                expect(configs.App.port).toEqual(3000);
                expect(configs.Database.port).toEqual(3306);
                expect(configs.App.sessionSecret).not.toBeUndefined();
                expect(configs.Email.password).not.toBeUndefined();
                done();
            }, true);
        });

        it("should return only syadmin-viewable configs", function(done) {
            ConfigManager.getConfigs(function(e, configs){
                expect(configs.App.sessionSecret).toBeUndefined();
                expect(configs.Email.password).toBeUndefined();
                done();
            });
        });

    });

    describe('getConfig', function(){

        it("should fail given invalid section", function(done) {
            ConfigManager.getConfig('invalid', function(e){
                expect(e).toEqual('invalid-section');
                done();
            });
        });

        it("should return config for one section", function(done) {
            ConfigManager.getConfig('App', function(e, config){
                expect(config.port).toEqual(3000);
                expect(config.sessionSecret).toBeUndefined();
                done();
            });
        });

    });

    describe('retrieveLocalStartupProperties', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should read from filesystem and set in global config", function(done) {
            var fsStubInst = {
                readFileSync: function(){
                    return 'consolePort=3001\r\nhttpPort=9091';
                }
            };
            ConfigManager.define(fsStubInst, null, null, null, mmxManagerStub);
            expect(ConfigManager.configs.App.port).toEqual(3000);
            expect(ConfigManager.configs.MMX.webPort).toEqual(9090);
            ConfigManager.retrieveLocalStartupProperties();
            setTimeout(function(){
                expect(ConfigManager.configs.App.port).toEqual(3001);
                expect(ConfigManager.configs.MMX.webPort).toEqual(9091);
                done();
            }, 100);
        });

    });

    describe('getAutoLoginConfig', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should fail to read an invalid format", function(done) {
            var fsStubInst = {
                readFile: function(configPath, encoding, cb){
                    cb(null, 'not a json');
                },
                unlink: function(path, cb){
                    cb();
                }
            };
            ConfigManager.define(fsStubInst, null, null, null, mmxManagerStub);
            ConfigManager.getAutoLoginConfig(function(e, obj){
                expect(e).toEqual('invalid-format');
                done();
            });
        });

        it("should read filesystem and user credentials", function(done) {
            var fsStubInst = {
                readFile: function(configPath, encoding, cb){
                    cb(null, '{"email":"sysadmin@company.com","password":"admin"}');
                },
                unlink: function(path, cb){
                    cb();
                }
            };
            ConfigManager.define(fsStubInst, null, null, null, mmxManagerStub);
            ConfigManager.getAutoLoginConfig(function(e, obj){
                expect(obj.email).toEqual('sysadmin@company.com');
                expect(obj.password).toEqual('admin');
                done();
            });
        });

    });

    describe('setConfig', function(){

        afterEach(function(done){
            ConfigManager.configs = Helper.deepCopy(configStatic);
            ConfigManager.define(fsStub, null, null, null, mmxManagerStub);
            done();
        });

        it("should fail given invalid section", function(done) {
            ConfigManager.setConfig('invalid', {}, function(e){
                expect(e).toEqual('invalid-section');
                done();
            });
        });

        it("should set log handler", function(done) {
            var obj = {
                "enabled": false,
                "level": "verbose"
            };
            expect(ConfigManager.configs.DatabaseLog.level).toEqual('info');
            ConfigManager.setConfig('DatabaseLog', obj, function(e){
                expect(e).toBeUndefined();
                expect(ConfigManager.configs.DatabaseLog.level).toEqual('verbose');
                done();
            });
        });

        it("should set mmx connectivity", function(done) {
            var obj = {
                "host": "localhost",
                "ssl": false,
                "webPort": 9090,
                "user": "admin",
                "password": "admin"
            };
            ConfigManager.setConfig('MMX', obj, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        it("should set mmx configs", function(done) {
            var obj = {
                "host": "localhost",
                "ssl": false,
                "webPort": 9090,
                "user": "admin",
                "password": "admin"
            };
            var mmxManagerStubInst = {
                setConfigs : function(obj, cb){
                    cb();
                }
            };
            ConfigManager.define(fsStub, null, null, null, mmxManagerStubInst);
            ConfigManager.setConfig('MessagingSettings', obj, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

    });

});


