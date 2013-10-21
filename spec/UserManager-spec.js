var UserManager = require("../lib/UserManager")
, Helper = require('./Helper')
, orm = require('../lib/orm')
, bcrypt = require('bcrypt');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe('UserManager database setup', function(){
    beforeAll(function(done){
        orm.setup('./lib/models', function(){
            done();
        });
    });
});

describe("UserManager registerGuest", function() {
    var user;

    beforeEach(function() {
        user = {
            firstName: "John",
            lastName: "Appleseed",
            email: "john.appleseed@magnetapi.com",
            companyName: "Apple Inc."
        };
    });

    describe("should fail registration", function() {

        it("if the firstName is missing", function(done) {
//            delete user.firstName;
            user.firstName = '';
            UserManager.registerGuest(user, false, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the lastName is missing", function(done) {
//            delete user.lastName;
            user.lastName = '';
            UserManager.registerGuest(user, false, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the email is missing", function(done) {
//            delete user.email;
            user.email = '';
            UserManager.registerGuest(user, false, function(registrationStatus) {
                expect(registrationStatus).toBeUndefined(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the email is invalid", function(done) {
            user.email = "foo@magnet";
            UserManager.registerGuest(user, false, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });

        it("if the companyName is missing", function(done) {
//            delete user.companyName;
            user.companyName = '';
            UserManager.registerGuest(user, false, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
                done();
            });
        });
    });

    it("should succeed if firstName is null", function(done) {
        delete user.firstName;
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('guest');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should succeed if lastName is null", function(done) {
        delete user.lastName;
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('guest');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should succeed if companyName is null", function(done) {
        delete user.companyName;
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('guest');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('guest');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should notify if the user is already registered", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            UserManager.registerGuest(user, false, function(registrationStatus, user) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.USER_ALREADY_EXISTS);
                user.destroy().success(function() {
                    done();
                });
            });
        });
    });

    it("should not save extra attributes", function(done) {
        user.password = "MySecurePassword";
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
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
            UserManager.approveUser(user, false, function(approvalStatus) {
                expect(approvalStatus).toEqual(UserManager.ApproveUserStatusEnum.USER_DOES_NOT_EXIST);
                done();
            });
        });
    });

    beforeEach(function() {
        user = {
            firstName: "John",
            lastName: "Appleseed",
            email: "john.appleseed@magnetapi.com",
            companyName: "Apple Inc."
        };
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, u) {
            UserManager.approveUser({magnetId: user.magnetId}, false, function(approvalStatus, user) {
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
            email: "john.appleseed@magnetapi.com",
            companyName: "Apple Inc.",
            password: password,
            roleWithinCompany: 'Software Engineer',
            country: 'No Country For Old Men'
        };
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, registeredUser) {
            UserManager.approveUser({magnetId: registeredUser.magnetId}, false, function(approvalStatus, approvedUser) {
//                user.firstName = "Jane"; // should not be allowed
                user.magnetId = registeredUser.magnetId;
                UserManager.becomeDeveloper(user, function(status, u) {
                    expect(status).toEqual(UserManager.BecomeDeveloperStatusEnum.SUCCESSFUL);
                    expect(u).not.toBeNull();
                    expect(u.userType).toEqual('developer');
                    expect(u.country).toEqual(user.country);
                    expect(u.roleWithinCompany).toEqual(user.roleWithinCompany);
                    expect(bcrypt.compareSync(password, u.password)).toBeTruthy();
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

                            Helper.removeUser(cloudAccount.magnetId, function(){});
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

describe("UserManager sendForgotPasswordEmail", function() {
    var user;
    var password = 'test';
    var firstName = 'John';

    beforeEach(function() {
        user = {
            firstName: firstName,
            lastName: "Appleseed",
            email: "john.appleseed@magnetapi.com",
            companyName: "Apple Inc.",
            password: password,
            roleWithinCompany: 'Software Engineer',
            country: 'No Country For Old Men'
        };
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, registeredUser) {
            UserManager.approveUser({magnetId: registeredUser.magnetId}, false, function(approvalStatus, approvedUser) {
//                user.firstName = "Jane"; // should not be allowed
                user.magnetId = registeredUser.magnetId;
                UserManager.becomeDeveloper(user, function(status, u) {
                    UserManager.sendForgotPasswordEmail({email: u.email}, function(sendForgotPassword) {
                        u.reload().success(function() {
                            expect(u.passwordResetToken).not.toBeNull();
                            expect(sendForgotPassword).toEqual(UserManager.SendForgotPasswordEmailEnum.EMAIL_SUCCESSFUL);
                            // Clean up
                            u.getCloudAccounts().success(function(cloudAccounts) {
                                var cloudAccount = cloudAccounts[0];
                                Helper.removeUser(cloudAccount.magnetId, function(){});
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

    it("should fail if the user is not a developer", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            UserManager.sendForgotPasswordEmail({email: user.email}, function(sendForgotPassword) {
                expect(sendForgotPassword).toEqual(UserManager.SendForgotPasswordEmailEnum.USER_DOES_NOT_EXIST);
                user.reload().success(function() {
                    expect(user.password).toBeNull();
                    user.destroy().success(function() {
                        done();
                    });
                })
            });
        });
    });
});

describe("UserManager resetPassword", function() {
    var user;
    var password = 'test';
    var firstName = 'John';

    beforeEach(function() {
        user = {
            firstName: firstName,
            lastName: "Appleseed",
            email: "john.appleseed@magnetapi.com",
            companyName: "Apple Inc.",
            password: password,
            roleWithinCompany: 'Software Engineer',
            country: 'No Country For Old Men'
        };
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, registeredUser) {
            UserManager.approveUser({magnetId: registeredUser.magnetId}, false, function(approvalStatus, approvedUser) {
//                user.firstName = "Jane"; // should not be allowed
                user.magnetId = registeredUser.magnetId;
                UserManager.becomeDeveloper(user, function(status, u) {
                    UserManager.sendForgotPasswordEmail({email: u.email}, function(sendForgotPassword) {
                        u.reload().success(function() {

                            UserManager.resetPassword({password: 'newPassword', passwordResetToken: u.passwordResetToken}, function(status) {
                                u.reload().success(function() {
                                    expect(bcrypt.compareSync('newPassword', u.password)).toBeTruthy();
                                    expect(u.passwordResetToken).toBeNull();
                                    // Clean up
                                    u.getCloudAccounts().success(function(cloudAccounts) {
                                        var cloudAccount = cloudAccounts[0];
                                        Helper.removeUser(cloudAccount.magnetId, function(){});
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
        });
    });
});