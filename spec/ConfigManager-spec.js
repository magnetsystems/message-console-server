var ConfigManager = require("../lib/ConfigManager")
 , Helper = require('./Helper')
 , orm = require('../lib/orm')
, fs = require('fs')
, magnetId = require('node-uuid')
, _ = require('underscore');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe('ConfigManager', function(){

    describe('init', function(){

        it("should callback if server is not configured", function(done) {
            ENV_CONFIG.App.configured = false;
            ConfigManager.init(function(e){
                expect(e).toBeUndefined();
                done();
            });
        });

        it("should callback if server is configured", function(done) {
            ENV_CONFIG.App.configured = true;
            ConfigManager.init(function(e){
                expect(e).toBeUndefined();
                done();
            });
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

});


