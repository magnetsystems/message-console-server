var LogManager = require("../lib/LogManager")
 , Helper = require('./Helper')
 , orm = require('../lib/orm')
, fs = require('fs')
, sinon = require('sinon')
, mysql = require('mysql')
, magnetId = require('node-uuid')
, _ = require('underscore');

jasmine.getEnv().defaultTimeoutInterval = 5000;

describe('LogManager', function(){

    beforeAll(function(done){
        ENV_CONFIG.DatabaseLog.enabled = false;
        done();
    });

    var configStatic = Helper.deepCopy(require('../lib/config/config.json'));

    afterEach(function(done){
        ENV_CONFIG = Helper.deepCopy(configStatic);
        done();
    });

    describe('refreshLogHandlers', function(){

        it("should initialize all log handlers", function(done) {
            LogManager.refreshLogHandlers();
            done();
        });

    });

    describe('setConsoleLogHandler', function(){

        it("should set console log handler", function(done) {
            expect(ENV_CONFIG.ConsoleLog.level).not.toEqual('error');
            ENV_CONFIG.ConsoleLog.level = 'error';
            LogManager.setConsoleLogHandler();
            expect(ENV_CONFIG.ConsoleLog.level).toEqual('error');
            done();
        });

    });

    describe('setFileLogHandler', function(){

        it("should set file log handler", function(done) {
            expect(ENV_CONFIG.FileLog.level).not.toEqual('error');
            ENV_CONFIG.FileLog.level = 'error';
            LogManager.setFileLogHandler();
            expect(ENV_CONFIG.FileLog.level).toEqual('error');
            done();
        });

    });

    describe('setDatabaseLogHandler', function(){

        it("should set file log handler", function(done) {
            expect(ENV_CONFIG.DatabaseLog.level).not.toEqual('error');
            ENV_CONFIG.DatabaseLog.level = 'error';
            LogManager.setDatabaseLogHandler();
            expect(ENV_CONFIG.DatabaseLog.level).toEqual('error');
            done();
        });

    });

    describe('setEmailAlertsHandler', function(){

        it("should set file log handler", function(done) {
            expect(ENV_CONFIG.EmailAlerts.level).not.toEqual('warn');
            ENV_CONFIG.EmailAlerts.enabled = true;
            ENV_CONFIG.EmailAlerts.recipient = 'test@magnet.com';
            ENV_CONFIG.EmailAlerts.level = 'warn';
            LogManager.setEmailAlertsHandler();
            expect(ENV_CONFIG.EmailAlerts.level).toEqual('warn');
            done();
        });

    });

});


