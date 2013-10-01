/**
 * Created with JetBrains WebStorm.
 * User: pshah
 * Date: 9/26/13
 * Time: 11:56 AM
 * To change this template use File | Settings | File Templates.
 */
var AccountManager = require("../lib/AccountManager")
 , hash = require('../lib/modules/hash')
 , CloudHelper = require('./CloudHelper')
 , UserManager = require('../lib/UserManager')
 , EmailService = require('../lib/EmailService');
// TODO: Database details are hardcoded!
require('../lib/orm').setup('./lib/models', true, 'developercenter', 'root');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe("AccountManager manualLogin", function() {
    var user;
    var password = 'test';

    beforeEach(function() {
        user = {
            firstName: "John",
            lastName: "Appleseed",
            email: "john.appleseed@apple.com",
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

                                CloudHelper.removeUser(cloudAccount.magnetId, function(){});
                                cloudAccount.destroy().success(function() {
                                    approvedUser.destroy().success(function() {
                                        done();
                                    });
                                });
                            });
                        })
                    });
                });
            });
        });
    });
});

