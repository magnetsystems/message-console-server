/**
 * Created with JetBrains WebStorm.
 * User: pshah
 * Date: 9/26/13
 * Time: 11:56 AM
 * To change this template use File | Settings | File Templates.
 */
var AccountManager = require("../lib/AccountManager")
 , hash = require('../lib/modules/hash')
 , UserManager = require('../lib/UserManager');
// TODO: Database details are hardcoded!
require('../lib/orm').setup('./lib/models', true, 'developercenter', 'root');

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
            UserManager.registerGuest(user, function(registrationStatus, guestUser) {
                AccountManager.manualLogin(user.email, user.password, function(e, u){
                    expect(e).toEqual('invalid-login');
                    guestUser.destroy().success(function() {
                        done();
                    });
                });
            });
        });

        it("if the password didn't match", function(done) {
            UserManager.registerGuest(user, function(registrationStatus, u) {
                UserManager.approveUser({magnetId: u.magnetId}, function(approvalStatus, approvedUser) {
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
        UserManager.registerGuest(user, function(registrationStatus, u) {
            UserManager.approveUser({magnetId: u.magnetId}, function(approvalStatus, approvedUser) {
                UserManager.becomeDeveloper(user, function(status, u) {
                    AccountManager.manualLogin(user.email, password, function(e, u){
                        expect(e).toBeNull();
                        expect(u).not.toBeNull();
                        approvedUser.destroy().success(function() {
                            done();
                        });
                    });
                });
            });
        });
    });
});

