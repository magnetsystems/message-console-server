var Cloud = require("../lib/Cloud");
var AWS = require('aws-sdk');

AWS.config.loadFromPath('./lib/config/aws-config.json');
var iam = new AWS.IAM({apiVersion: '2010-05-08'});

//jasmine.getEnv().defaultTimeoutInterval = 1500;

describe("Cloud allocateCloudAccount", function() {
    var userName = "testfromnodejs@magnet.com";

    beforeEach(function(done) {
        console.log("beforeEach");
        iam.deleteUser({UserName: userName}, function(err, data) {
            if (err) {
                console.error("Could not delete user = " + err);
            }
            done();
        });
    });

    afterEach(function(done) {
        console.log("afterEach");
        iam.deleteUser({UserName: userName}, function(err, data) {
            if (err) {
                console.error("Could not delete user = " + err);
            }
            done();
        });
    });

    it("should create access keys if the user did not exist", function(done) {
        Cloud.allocateCloudAccount(userName, function(err, data) {
            expect(err).toBeNull();
            expect(data).not.toBeNull();
            expect(data.AccessKeyId).not.toBeNull();
            expect(data.SecretAccessKey).not.toBeNull();
            done();
        });
    });

    xit("should create access keys if the user already exists", function(done) {
        Cloud.allocateCloudAccount(userName, function(err, data) {
            expect(err).toBeNull();
            expect(data).not.toBeNull();
            expect(data.AccessKeyId).not.toBeNull();
            expect(data.SecretAccessKey).not.toBeNull();
            done();
        });
    });
});
