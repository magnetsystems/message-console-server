var Cloud = require("../lib/Cloud");
var AWS = require('aws-sdk');

AWS.config.loadFromPath('./lib/config/aws-config.json');
var iam = new AWS.IAM({apiVersion: '2010-05-08'});

//jasmine.getEnv().defaultTimeoutInterval = 1500;

function deleteCloudUser(userName, done) {
    iam.deleteUser({UserName: userName}, function (err, data) {
        if (!err) {
        } else {
            console.error("Could not delete user = " + err);
        }
        done();
    });
}

function removeUser(userName, done) {
    // Cleanup: Delete policy, keys and then User
    // We assume that our User would have a max of 1 access key
    iam.deleteUserPolicy({UserName: userName, PolicyName: 'User-Sandbox-Access-Policy'}, function (err, data) {
        if (!err) {
            iam.listAccessKeys({UserName: userName}, function(err, data) {
                if (!err) {
                    if (data.AccessKeyMetadata.length) {
                        data.AccessKeyMetadata.forEach(function(accessKey) {
                            console.log("Got access key = " + accessKey.AccessKeyId);
                            iam.deleteAccessKey({UserName: userName, AccessKeyId: accessKey.AccessKeyId}, function(err, data) {
                                if (!err) {
                                    console.log("Deleted access key = " + accessKey.AccessKeyId);
                                    // We assume that our User would have a max of 1 access key
                                    deleteCloudUser(userName, done);
                                } else {
                                    console.error("Error deleting access key = " + accessKey.AccessKeyId);
                                    done();
                                }
                            });
                        });
                    } else {
                        deleteCloudUser(userName, done);
                    }
                } else {
                    console.error("Error getting access keys = " + err);
                }
            });
        } else {
            console.error("Could not delete user policy = " + err);
            done();
        }
    });
}

describe("Cloud allocateCloudAccount", function() {
    describe("with existing user", function() {
        var userName = "NodeJsTests_" + new Date().getTime() + "@magnet.com";

        beforeEach(function(done) {
            console.log("beforeEach");
            // TODO: Policy name is hardcoded!
            iam.createUser({UserName: userName}, function(err, data) {
                if (!err) {
                    console.log("Created user = " + userName);
                } else {
                    console.log("Could not create user = " + userName);
                }
                done();
            });
        });

        afterEach(function(done) {
            removeUser(userName, done);
        });

        it("should create required keys if the User did not have keys", function(done) {
            Cloud.allocateCloudAccount(userName, function(err, data) {
                expect(err).toBeNull();
                expect(data).not.toBeNull();
                expect(data.AccessKeyId).not.toBeNull();
                expect(data.SecretAccessKey).not.toBeNull();
                done();
            });
        });

        it("should re-create required keys if the User already had keys", function(done) {
            iam.createAccessKey({UserName: userName}, function(err, data) {
                Cloud.allocateCloudAccount(userName, function(err, data) {
                    expect(err).toBeNull();
                    expect(data).not.toBeNull();
                    expect(data.AccessKeyId).not.toBeNull();
                    expect(data.SecretAccessKey).not.toBeNull();
                    done();
                });
            });
        });
    });
});

describe("Cloud allocateCloudAccount", function() {
    var userName = "NodeJsTests_" + new Date().getTime() + "@magnet.com";

    afterEach(function(done) {
        removeUser(userName, done);
    });

    it("should create required keys if the User didn't exist", function(done) {
        Cloud.allocateCloudAccount(userName, function(err, data) {
            expect(err).toBeNull();
            expect(data).not.toBeNull();
            expect(data.AccessKeyId).not.toBeNull();
            expect(data.SecretAccessKey).not.toBeNull();
            done();
        });
    });
});

xdescribe("Cloud allocateCloudAccount", function() {
    describe("S3 tests", function() {
        var userName = "NodeJsTests_" + new Date().getTime() + "@magnet.com";
        var s3;
        var accessKeyId;
        var secretAccessKey;

        beforeEach(function (done) {
            Cloud.allocateCloudAccount(userName, function(err, data) {
                if (!err) {
                    accessKeyId = data.AccessKeyId;
                    secretAccessKey = data.SecretAccessKey;
                    console.log("data = " + JSON.stringify(data));
                    s3 = new AWS.S3({apiVersion: '2006-03-01', secretAccessKey: secretAccessKey, accessKeyId: accessKeyId});
                } else {
                    console.error("Error creating keys = " + err);
                }
                done();
            });
        });

        afterEach(function(done) {
            removeUser(userName, done);
        });

        it("should create appropriate policy", function(done) {
            s3.putObject({Body: 'HolaMundo!', Bucket: 'magnet-audit-test', Key: 'HolaMundo'}, function(err, data) {
                if (!err) {
                    console.log("Successfully uploaded data to myBucket/myKey");
                    s3.listObjects({Bucket: 'magnet-audit-test'}, function(err, data) {
                        if (!err) {
                            console.log(JSON.stringify(data));
                        } else {
                            console.error("Could not list objects = " + err);
                        }
                    });
                } else {
                    console.error("Could not upload = " + err);
                }
                done();
            });

        });
    });
});
