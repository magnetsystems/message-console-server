var Cloud = require("../lib/Cloud");
var AWS = require('aws-sdk');
var CloudConfig = require("../lib/config/CloudConfig");

AWS.config.loadFromPath('./lib/config/aws-config.json');
var iam = new AWS.IAM({apiVersion: CloudConfig.AWS.IAMApiVersion});

//jasmine.getEnv().defaultTimeoutInterval = 1500;

var beforeAll = function(fn) {
    it('[beforeAll]', fn, 100000);
}

var afterAll = function(fn) {
    it('[afterAll]', fn, 100000)
}

//removeUser(CloudConfig.Uploader.UserName, function(){
//    console.log("Deleted user");
//    Cloud.allocateCloudAccount(CloudConfig.Uploader.UserName, function(err, data) {
//        if (!err) {
//            CloudConfig.Uploader.AccessKeyId = data.accessKeyId;
//            CloudConfig.Uploader.SecretAccessKey = data.secretAccessKey;
//        } else {
//            console.error("Error creating keys = " + err);
//        }
//    })
//});
//Cloud.allocateCloudAccount(CloudConfig.Uploader.UserName, function(err, data) {
//    if (!err) {
//        console.log("WE ARE HERE");
//        console.log(JSON.stringify(data));
//        console.log("data.accessKeyId = " + data.AccessKeyId);
//        CloudConfig.Uploader.AccessKeyId = data.accessKeyId;
//        CloudConfig.Uploader.SecretAccessKey = data.SecretAccessKey;
//        console.log(JSON.stringify(uploader));
//    } else {
//        console.error("Error creating keys = " + err);
//    }
//});

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
    iam.deleteUserPolicy({UserName: userName, PolicyName: CloudConfig.PolicyName}, function (err, data) {
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
    var s3 = new AWS.S3({apiVersion: CloudConfig.AWS.S3ApiVersion});
    var fileName = 'test.txt';
    var key = CloudConfig.Uploader.UserName + '/' + fileName;
    var otherKey = 'pshahtest' + '/' + fileName;
    var bucketName = CloudConfig.AWS.BucketName;
    var otherBucketName = CloudConfig.AWS.SomeOtherBucketName;
    var body = "Dummy text file to test CRUD on S3 for given LoginCredentials.";
    var bodyBuffer = new Buffer(body, "utf-8");

    beforeAll(function(done) {
        s3.putObject({Body: bodyBuffer, Bucket: bucketName, Key: otherKey}, function(err, data) {
            expect(err).toBeNull();
            s3.putObject({Body: bodyBuffer, Bucket: otherBucketName, Key: key}, function(err, data) {
                expect(err).toBeNull();
                s3.config.credentials.accessKeyId = CloudConfig.Uploader.AccessKeyId;
                s3.config.credentials.secretAccessKey = CloudConfig.Uploader.SecretAccessKey;
                done();
            });
        });
    });

    // The user has to be created at the global scope instead of beforeEach
    // because it takes a few seconds to minutes for the newly created User to become active in S3.

    it("should be able to write to own folder in the same bucket", function(done) {
        this.after(function() {
            s3.deleteObject({Bucket: bucketName, Key: key}, function (err, data) {
            });
        });

        s3.putObject({Body: bodyBuffer, Bucket: bucketName, Key: key}, function(err, data) {
            expect(err).toBeNull();
            s3.getObject({Bucket: bucketName, Key: key}, function (err, data) {
                expect(err).toBeNull();
                expect(data.Body.toString()).toEqual(body);
                done();
            });
        });
    }, 20000);

    it("should not be able to write to a different folder in the same bucket", function(done) {
        var newKey = 'randomFolderKey' + '/' + fileName;

        s3.putObject({Body: bodyBuffer, Bucket: bucketName, Key: newKey}, function(err, data) {
            expect(err).not.toBeNull();
            done();
        });
    }, 20000);

    it("should not be able to write to a different bucket", function(done) {
        s3.putObject({Body: bodyBuffer, Bucket: otherBucketName, Key: key}, function(err, data) {
            expect(err).not.toBeNull();
            done();
        });
    }, 20000);

    it("should not be able to get an object from a foreign folder", function(done) {
        s3.getObject({Bucket: bucketName, Key: otherKey}, function(err, data) {
            expect(err).not.toBeNull();
            done();
        });
    }, 20000);

    it("should not be able to get an object from a foreign bucket", function(done) {
        s3.getObject({Bucket: otherBucketName, Key: key}, function(err, data) {
            expect(err).not.toBeNull();
            done();
        });
    }, 20000);

    it("should not be able to delete an object from a foreign folder", function(done) {
        s3.deleteObject({Bucket: bucketName, Key: otherKey}, function(err, data) {
            expect(err).not.toBeNull();
            done();
        });
    }, 20000);

    it("should not be able to delete an object from a foreign bucket", function(done) {
        s3.deleteObject({Bucket: otherBucketName, Key: key}, function(err, data) {
            expect(err).not.toBeNull();
            done();
        });
    }, 20000);

    afterAll(function(done) {
        AWS.config.loadFromPath('./lib/config/aws-config.json');
        iam = new AWS.IAM({apiVersion: CloudConfig.AWS.IAMApiVersion});
        var s3 = new AWS.S3({apiVersion: CloudConfig.AWS.S3ApiVersion});
        s3.deleteObject({Bucket: bucketName, Key: otherKey}, function(err, data) {
            expect(err).toBeNull();
            s3.deleteObject({Bucket: otherBucketName, Key: key}, function(err, data) {
                expect(err).toBeNull();
//                removeUser(CloudConfig.Uploader.UserName, done);
                done();
            });
        });
    });
});
