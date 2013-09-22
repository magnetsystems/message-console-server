var Cloud = require("../lib/Cloud");
var AWS = require('aws-sdk');

AWS.config.loadFromPath('./lib/config/aws-config.json');
var iam = new AWS.IAM({apiVersion: '2010-05-08'});

//jasmine.getEnv().defaultTimeoutInterval = 1500;

var uploader = new Object();
uploader.userName = "NodeJsUploadTest@magnet.com";
//removeUser(uploader.userName, function(){
//    console.log("Deleted user");
//    Cloud.allocateCloudAccount(uploader.userName, function(err, data) {
//        if (!err) {
//            uploader.AccessKeyId = data.accessKeyId;
//            uploader.SecretAccessKey = data.secretAccessKey;
//        } else {
//            console.error("Error creating keys = " + err);
//        }
//    })
//});
Cloud.allocateCloudAccount(uploader.userName, function(err, data) {
    if (!err) {
        uploader.AccessKeyId = data.accessKeyId;
        uploader.SecretAccessKey = data.secretAccessKey;
    } else {
        console.error("Error creating keys = " + err);
    }
})

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

describe("Cloud allocateCloudAccount without existing user", function() {
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

describe("Cloud allocateCloudAccount generated keys", function() {
    var s3 = new AWS.S3({apiVersion: '2006-03-01', secretAccessKey: uploader.SecretAccessKey, accessKeyId: uploader.AccessKeyId});
    var fileName = 'test.txt';
    var key = uploader.userName + '/' + fileName;
    var bucketName = 'magnet-audit-test';
    var body = 'Dummy text file to test CRUD on S3 for given LoginCredentials.';

    // The user has to be created at the global scope instead of beforeEach
    // because it takes a few seconds to minutes for the newly created User to become active in S3.

    it("should allow uploading to own directory in Bucket", function(done) {
        this.after(function() {
            s3.deleteObject({Bucket: bucketName, Key: key}, function (err, data) {
            });
        });

        s3.putObject({Body: body, Bucket: bucketName, Key: key}, function(err, data) {
            console.log("Successfully uploaded %s to %s", key, bucketName);
            expect(err).toBeNull();
            s3.getObject({Bucket: bucketName, Key: key}, function (err, data) {
                expect(err).toBeNull();
                expect(data.Body.toString()).toEqual(body);
                done();
            });
        });
    }, 20000);

    // FIXME: This test should fail
    xit("shouldn't allow uploading to other User's directory in Bucket", function(done) {
        this.after(function() {
            removeUser(uploader.userName, function(){});
        });
        var newKey = 'otherUsersDirectory' + '/' + fileName;
        s3.putObject({Body: body, Bucket: bucketName, Key: newKey}, function(err, data) {
            if (!err) {
                console.log("Successfully uploaded %s to %s", newKey, bucketName);
            }
            expect(err).not.toBeNull();
            done();
        });
    }, 20000);
});
