var Helper = require('./Helper')
, sinon = require('sinon')
, mysql = require('mysql');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe("JumpStartUserManager", function() {
    it("should have no pool if isEnabled is false", function() {

        var jsSettings = ENV_CONFIG.JumpStart;
        delete ENV_CONFIG.JumpStart;
//        console.log(require.cache);
        delete require.cache[require.resolve("../lib/JumpStartUserManager.js")];
        var JumpStartUserManagerWithMissingConfig = require("../lib/JumpStartUserManager");
        expect(JumpStartUserManagerWithMissingConfig.pool).toBeUndefined();

        ENV_CONFIG.JumpStart = jsSettings;
    });
});

describe("JumpStartUserManager", function() {

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

        poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
        connectionMock.expects("release").once();

        expect(JumpStartUserManager.pool).not.toBeNull();
        JumpStartUserManager.pool = poolMock.object;
        expect(JumpStartUserManager.isEnabled).toBeTruthy();
    });

    describe("createUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            connectionMock.expects("query").once().withArgs("CALL user_create('" + userName + "','" + password + "')").callsArgWith(1, null, connectionMock.object);
            connectionMock.expects("escape").twice().returnsArg(0);

            var called = false;
            var callback = function() {
                called = true;
            };

            JumpStartUserManager.createUser(userName, password, callback);

            expect(called).toBeTruthy();

            // http://stackoverflow.com/questions/4144686/how-to-write-a-test-which-expects-an-error-to-be-thrown
            // Anonymous function is needed
            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });

    describe("updateUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            connectionMock.expects("query").once().withArgs("CALL user_update('" + userName + "','" + password + "')").callsArgWith(1, null, connectionMock.object);
            connectionMock.expects("escape").twice().returnsArg(0);

            var called = false;
            var callback = function() {
                called = true;
            };

            JumpStartUserManager.updateUser(userName, password, callback);

            expect(called).toBeTruthy();

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });

    describe("deleteUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            connectionMock.expects("query").once().withArgs("CALL user_delete('" + userName + "')").callsArgWith(1, null, connectionMock.object);
            connectionMock.expects("escape").once().returnsArg(0);

            var called = false;
            var callback = function() {
                called = true;
            };

            JumpStartUserManager.deleteUser(userName, callback);

            expect(called).toBeTruthy();

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });
});
