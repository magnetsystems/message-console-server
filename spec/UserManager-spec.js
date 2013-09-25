var UserManager = require("../lib/UserManager");
var User = require("../lib/models/User");
// TODO: Database details are hardcoded!
require('../lib/orm').setup('./lib/models', true, 'developercenter', 'root');

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
        UserManager.registerGuest(user, function(registrationStatus, u) {
            u.reload().success(function() {
                expect(u.password).toBeNull();
                u.destroy().success(function() {
                    done();
                });
            })
        });
    });
});
