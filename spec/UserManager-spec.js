var UserManager = require("../lib/UserManager")
, hash = require('../lib/modules/hash');
// TODO: Database details are hardcoded!
require('../lib/orm').setup('./lib/models', true, 'developercenter', 'root');

// TODO: Code below is duplicate

var Cloud = require("../lib/Cloud");
var AWS = require('aws-sdk');
var CloudConfig = require("../lib/config/CloudConfig");

AWS.config.loadFromPath('./lib/config/aws-config.json');
var iam = new AWS.IAM({apiVersion: CloudConfig.AWS.IAMApiVersion});


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

describe("UserManager registerGuest", function() {
    var user;

    beforeEach(function() {
        user = {
            firstName: "John",
            lastName: "Appleseed",
            email: "john.appleseed@apple.com",
            companyName: "Apple Inc."
        };
    });

    describe("should fail registration", function() {

        it("if the firstName is missing", function(done) {
            delete user.firstName;
            UserManager.registerGuest(user, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the lastName is missing", function(done) {
            delete user.lastName;
            UserManager.registerGuest(user, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the email is missing", function(done) {
            delete user.email;
            UserManager.registerGuest(user, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the email is invalid", function(done) {
            user.email = "foo@magnet";
            UserManager.registerGuest(user, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the companyName is missing", function(done) {
            delete user.companyName;
            UserManager.registerGuest(user, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('guest');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should notify if the user is already registered", function(done) {
        UserManager.registerGuest(user, function(registrationStatus, user) {
            UserManager.registerGuest(user, function(registrationStatus, user) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.USER_ALREADY_EXISTS);
                user.destroy().success(function() {
                    done();
                });
            });
        });
    });

    it("should not save extra attributes", function(done) {
        user.password = "MySecurePassword";
        UserManager.registerGuest(user, function(registrationStatus, user) {
            user.reload().success(function() {
                expect(user.password).toBeNull();
                user.destroy().success(function() {
                    done();
                });
            })
        });
    });
});

describe("UserManager approveUser", function() {
    var user;

    describe("should fail approval", function() {

        beforeEach(function() {
            user = {
                magnetId: "d2cf1210-25ae-11e3-a8c7-c743ef283553"
            };
        });

        it("if the magnetId does not exist", function(done) {
            UserManager.approveUser(user, function(approvalStatus) {
                expect(approvalStatus).toEqual(UserManager.ApproveUserStatusEnum.USER_DOES_NOT_EXIST);
                done();
            });
        });
    });

    beforeEach(function() {
        user = {
            firstName: "John",
            lastName: "Appleseed",
            email: "john.appleseed@apple.com",
            companyName: "Apple Inc."
        };
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, function(registrationStatus, u) {
            UserManager.approveUser({magnetId: user.magnetId}, function(approvalStatus, user) {
                expect(user).not.toBeNull();
                expect(approvalStatus).toEqual(UserManager.ApproveUserStatusEnum.APPROVAL_SUCCESSFUL);
                expect(user.userType).toEqual('approved');
                user.destroy().success(function() {
                    done();
                });
            });
        });
    });
});

describe("UserManager becomeDeveloper", function() {
    var user;
    var password = 'test';
    var firstName = 'John';

    describe("should fail", function() {

        beforeEach(function() {
            user = {
                magnetId: "d2cf1210-25ae-11e3-a8c7-c743ef283553"
            };
        });

        it("if the magnetId does not exist", function(done) {
            UserManager.becomeDeveloper(user, function(status) {
                expect(status).toEqual(UserManager.BecomeDeveloperStatusEnum.USER_DOES_NOT_EXIST);
                done();
            });
        });
    });

    beforeEach(function() {
        user = {
            firstName: firstName,
            lastName: "Appleseed",
            email: "john.appleseed@apple.com",
            companyName: "Apple Inc.",
            password: password,
            roleWithinCompany: 'Software Engineer',
            country: 'No Country For Old Men'
        };
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, function(registrationStatus, registeredUser) {
            UserManager.approveUser({magnetId: registeredUser.magnetId}, function(approvalStatus, approvedUser) {
                user.firstName = "Jane"; // should not be allowed
                user.magnetId = approvedUser.magnetId;
                UserManager.becomeDeveloper(user, function(status, u) {
                    expect(status).toEqual(UserManager.BecomeDeveloperStatusEnum.SUCCESSFUL);
                    expect(u).not.toBeNull();
                    expect(u.userType).toEqual('developer');
                    expect(u.country).toEqual(user.country);
                    expect(u.roleWithinCompany).toEqual(user.roleWithinCompany);
                    expect(u.password).toEqual(hash.md5(password));
                    u.reload().success(function() {
                        expect(u.firstName).toEqual(firstName);
                        // Clean up
                        u.getCloudAccounts().success(function(cloudAccounts) {
                            expect(cloudAccounts.length).toEqual(1);
                            var cloudAccount = cloudAccounts[0];
                            expect(cloudAccount).not.toBeNull();
                            expect(cloudAccount.magnetId).not.toBeNull();
                            expect(cloudAccount.bucketName).not.toBeNull();
                            expect(cloudAccount.accessKeyId).not.toBeNull();
                            expect(cloudAccount.secretAccessKey).not.toBeNull();

                            removeUser(cloudAccount.magnetId, function(){});
                            cloudAccount.destroy().success(function() {
                                u.destroy().success(function() {
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});