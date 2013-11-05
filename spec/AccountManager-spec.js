var AccountManager = require("../lib/AccountManager")
 , Helper = require('./Helper')
 , UserManager = require('../lib/UserManager')
 , EmailService = require('../lib/EmailService')
 , orm = require('../lib/orm')
 , bcrypt = require('bcrypt');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe('AccountManager database setup', function(){
    beforeAll(function(done){
        orm.setup('./lib/models', function(){
            done();
        });
    });
});

describe("AccountManager manualLogin", function() {
    var user;
    var password = 'test';

    beforeEach(function() {
        user = {
            firstName: "John",
            lastName: "Appleseed",
            email: "john.appleseed@magnetapi.com",
            companyName: "Apple Inc.",
            password: password,
            roleWithinCompany: 'Software Engineer',
            country: 'No Country For Old Men'
        };
    });

    describe("should fail login", function() {

        it("if the email didn't exist", function(done) {
            AccountManager.manualLogin(user.email, user.password, function(e, user){
                expect(e).toEqual('invalid-login');
                done();
            });
        });

        it("if the user is not approved", function(done) {
            UserManager.registerGuest(user, false, function(registrationStatus, guestUser) {
                AccountManager.manualLogin(user.email, user.password, function(e, u){
                    expect(e).toEqual('invalid-login');
                    guestUser.destroy().success(function() {
                        done();
                    });
                });
            });
        });

        it("if the password didn't match", function(done) {
            UserManager.registerGuest(user, false, function(registrationStatus, u) {
                UserManager.approveUser({magnetId: u.magnetId}, false, function(approvalStatus, approvedUser) {
                    AccountManager.manualLogin(user.email, user.password + 'foo', function(e, u){
                        expect(e).toEqual('invalid-login');
                        approvedUser.destroy().success(function() {
                            done();
                        });
                    });
                });
            });
        });

    });

    it("should succeed if the credentials are valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, u) {
            UserManager.approveUser({magnetId: u.magnetId}, false, function(approvalStatus, approvedUser) {
                UserManager.becomeDeveloper(user, function(status, u) {
                    AccountManager.manualLogin(user.email, password, function(e, u){
                        expect(e).toBeNull();
                        expect(u).not.toBeNull();
                        approvedUser.reload().success(function() {
                            // Clean up
                            approvedUser.getCloudAccounts().success(function(cloudAccounts) {
                                expect(cloudAccounts.length).toEqual(1);
                                var cloudAccount = cloudAccounts[0];
                                expect(cloudAccount).not.toBeNull();
                                expect(cloudAccount.magnetId).not.toBeNull();
                                expect(cloudAccount.bucketName).not.toBeNull();
                                expect(cloudAccount.accessKeyId).not.toBeNull();
                                expect(cloudAccount.secretAccessKey).not.toBeNull();

                                Helper.removeUser(cloudAccount.magnetId, function(){});
                                cloudAccount.destroy().success(function() {
                                    approvedUser.destroy().success(function() {
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

