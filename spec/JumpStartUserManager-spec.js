var JumpStartUserManager = require("../lib/JumpStartUserManager")
    , Helper = require('./Helper')
    , sinon = require('sinon');

var mysql = require('mysql');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe("JumpStartUserManager", function() {
    var pool;
    var poolMock;
    var connection;
    var connectionMock;
    var jumpstartUserManager;

    beforeEach(function() {
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
        connection = { query: function() {}, release: function() {} };
        connectionMock = sinon.mock(connection);

        poolMock.expects("getConnection").once().callsArgWith(0, null, connectionMock.object);
        connectionMock.expects("release").once();

        jumpstartUserManager = new JumpStartUserManager(poolMock.object);
    });

    describe("createUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            connectionMock.expects("query").once().withArgs("CALL user_create('pritesh.shah@magnet.com','Magnet435')").callsArgWith(1, null, connectionMock.object);

            jumpstartUserManager.createUser('pritesh.shah@magnet.com', 'Magnet435', function(){});

            // http://stackoverflow.com/questions/4144686/how-to-write-a-test-which-expects-an-error-to-be-thrown
            // Anonymous function is needed
            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });

    describe("updateUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            connectionMock.expects("query").once().withArgs("CALL user_update('pritesh.shah@magnet.com','Magnet435')").callsArgWith(1, null, connectionMock.object);

            jumpstartUserManager.updateUser('pritesh.shah@magnet.com', 'Magnet435', function(){});

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });

    describe("deleteUser", function() {
        it("should succeed if the underlying stored procedure succeeds", function() {
            connectionMock.expects("query").once().withArgs("CALL user_delete('pritesh.shah@magnet.com')").callsArgWith(1, null, connectionMock.object);

            jumpstartUserManager.deleteUser('pritesh.shah@magnet.com', function(){});

            expect(function(){ poolMock.verify() }).not.toThrow();
            expect(function(){ connectionMock.verify() }).not.toThrow();
        });
    });
});
