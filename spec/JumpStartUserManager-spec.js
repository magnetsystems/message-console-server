var Helper = require('./Helper')
, sinon = require('sinon')
, mysql = require('mysql');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe("JumpStartUserManager", function() {
    it("should have no pool if isEnabled is false", function() {

        ENV_CONFIG.JumpStart.syncJumpstartDB = false;
//        console.log(require.cache);
        delete require.cache[require.resolve("../lib/JumpStartUserManager.js")];
        var JumpStartUserManagerWithMissingConfig = require("../lib/JumpStartUserManager");
        expect(JumpStartUserManagerWithMissingConfig.pool).toBeUndefined();

    });
});

describe("JumpStartUserManager", function() {

    ENV_CONFIG.JumpStart.syncJumpstartDB = true;
    delete require.cache[require.resolve("../lib/JumpStartUserManager.js")];
    var JumpStartUserManager = require("../lib/JumpStartUserManager");

    var pool;
    var poolMock;
    var connection;
    var connectionMock;
    var userName;
    var password;

    beforeEach(function() {
        userName = 'john.appleseed@magnetapi.com';
        password = 'secure435';
        pool  = mysql.createPool({
            host     : ENV_CONFIG.JumpStart.Database.params.host,
            user     : ENV_CONFIG.JumpStart.Database.username,
            password : ENV_CONFIG.JumpStart.Database.password,
            database : ENV_CONFIG.JumpStart.Database.dbName,
            port     : ENV_CONFIG.JumpStart.Database.params.port
        });
        poolMock = sinon.mock(pool);
        // FIXME: The test hangs if I try the below!
//        pool.getConnection(function(err, connection) {
//            connectionMock = sinon.mock(connection);
//            done();
//        });
        // Workaround for the above
        connection = { query: function() {}, release: function() {}, escape: function() {} };
        connectionMock = sinon.mock(connection);

//        poolMock.expects("getConnection").atLeast(1).callsArgWith(0, null, connectionMock.object);
//        connectionMock.expects("release").once();

        expect(JumpStartUserManager.pool).not.toBeNull();
        JumpStartUserManager.pool = poolMock.object;
        expect(JumpStartUserManager.isEnabled).toBeTruthy();
    });

    describe("createUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_create(" + userName + "," + password + ")").callsArgWith(1, null, 'anyArg');
            connectionMock.expects("escape").twice().returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).toBeNull();
            };

            JumpStartUserManager.createUser(userName, password, callback);

            // http://stackoverflow.com/questions/4144686/how-to-write-a-test-which-expects-an-error-to-be-thrown
            // Anonymous function is needed
            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should fail if the underlying stored procedure fails", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_create(" + userName + "," + password + ")").callsArgWith(1, 'someError', 'anyArg');
            connectionMock.expects("escape").twice().returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.createUser(userName, password, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should update user if the user already exists", function() {
            var error = { sqlState: 99001 };
            poolMock.expects("getConnection").twice().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_create(" + userName + "," + password + ")").callsArgWith(1, error, 'anyArg');
            connectionMock.expects("query").once().withArgs("CALL user_update(" + userName + "," + password + ")");
            connectionMock.expects("escape").exactly(4).returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.createUser(userName, password, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should fail if connection could not be established", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, 'someError', 'anyArg');
            connectionMock.expects("release").never();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.createUser(userName, password, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });

    describe("updateUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_update(" + userName + "," + password + ")").callsArgWith(1, null, 'anyArg');
            connectionMock.expects("escape").twice().returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).toBeNull();
            };

            JumpStartUserManager.updateUser(userName, password, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should fail if the underlying stored procedure fails", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_update(" + userName + "," + password + ")").callsArgWith(1, 'someError', 'anyArg');
            connectionMock.expects("escape").twice().returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.updateUser(userName, password, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should create user if the user did not exist", function() {
            var error = { sqlState: 99002 };
            poolMock.expects("getConnection").twice().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_update(" + userName + "," + password + ")").callsArgWith(1, error, 'anyArg');
            connectionMock.expects("query").once().withArgs("CALL user_create(" + userName + "," + password + ")");
            connectionMock.expects("escape").exactly(4).returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.updateUser(userName, password, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should fail if connection could not be established", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, 'someError', 'anyArg');
            connectionMock.expects("release").never();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.updateUser(userName, password, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });

    describe("deleteUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_delete(" + userName + ")").callsArgWith(1, null, 'anyArg');
            connectionMock.expects("escape").once().returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).toBeNull();
            };

            JumpStartUserManager.deleteUser(userName, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should fail if the underlying stored procedure fails", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
            connectionMock.expects("query").once().withArgs("CALL user_delete(" + userName + ")").callsArgWith(1, 'someError', 'anyArg');
            connectionMock.expects("escape").once().returnsArg(0);
            connectionMock.expects("release").once();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.deleteUser(userName, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });

        it("should fail if connection could not be established", function() {
            poolMock.expects("getConnection").once().callsArgWith(0, 'someError', 'anyArg');
            connectionMock.expects("release").never();

            var callback = function(err) {
                expect(err).not.toBeNull();
            };

            JumpStartUserManager.deleteUser(userName, callback);

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });
});
