var UserManager = require('../lib/UserManager')
, orm = require('../lib/orm')
, bcrypt = require('bcryptjs')
, Helper = require('./Helper')
, magnetId = require('node-uuid')
, express = require('express')
, EmailService = require('../lib/EmailService')
, _ = require('underscore');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe('UserManager database setup', function(){
    beforeAll(function(done){
        orm.setup('./lib/models', function(){
            EmailService.sendEmail = function(params){
                params.success('mock message');
            };
            done();
        });
    });
});

describe("UserManager getBasicAuth", function() {

    it("should fail to convert invalid header", function(done) {
        var obj = UserManager.getBasicAuth('invalid');
        expect(obj).toEqual(false);
        done();
    });

    it("should convert basic auth header to user and password", function(done) {
        var obj = UserManager.getBasicAuth('Basic YWRtaW46YWRtaW4=');
        expect(obj.username).toEqual('admin');
        expect(obj.password).toEqual('admin');
        done();
    });

});

describe("UserManager registerGuest", function() {
    var user;

    beforeEach(function() {
        user = {
            firstName: "John",
            lastName: "Appleseed",
            email: magnetId.v1()+'25@magnet.com',
            companyName: "Apple Inc."
        };
    });

    describe("should fail registration", function() {

        it("if the email is missing", function(done) {
//            delete user.email;
            user.email = '';
            UserManager.registerGuest(user, false, function(registrationStatus) {
                expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_FAILED);
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

    });

    it("should succeed if firstName is null", function(done) {
        delete user.firstName;
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('approved');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should succeed if lastName is null", function(done) {
        delete user.lastName;
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('approved');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should succeed if companyName is null", function(done) {
        delete user.companyName;
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('approved');
            user.destroy().success(function() {
                done();
            });
        });
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, user) {
            expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
            expect(user.userType).toEqual('approved');
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

    it('should register a user invited by another user', function(done){
        var invitedUserObj = {
            email       : magnetId.v1()+'23@magnet.com',
            companyName : 'beer',
            firstName   : 'Pale',
            lastName    : 'Ale'
        };
        UserManager.create({
            userType     : 'developer',
            firstName    : 'Blue',
            lastName     : 'Moon',
            email        : magnetId.v1()+'24@magnet.com'
        }, function(e, developerUser){
            expect(e).toBeNull();
            UserManager.create({
                invitedEmail : invitedUserObj.email,
                userType     : 'invited',
                inviterId    : developerUser.id
            }, function(e, invitedUser){
                expect(e).toBeNull();
                UserManager.registerGuest(_.extend({
                        magnetId : invitedUser.magnetId
                }, invitedUserObj), false, function(registrationStatus, registeredUser){
                    expect(registrationStatus).toEqual(UserManager.RegisterGuestStatusEnum.REGISTRATION_SUCCESSFUL);
                    expect(registeredUser.userType).toEqual('approved');
                    done();
                });
            });
        });
    });

});

describe("UserManager approveUser", function() {
    var _user;

    beforeEach(function() {
        _user = {
            firstName   : 'John',
            lastName    : 'Appleseed',
            email       : magnetId.v1()+'26@magnet.com',
            companyName : 'Apple Inc.',
            userType    : 'approved'
        };
    });

    it("should fail approval if the magnetId does not exist", function(done) {
        _user = {
            magnetId: "d2cf1210-25ae-11e3-a8c7-c743ef283553"
        };
        UserManager.approveUser(_user, false, function(approvalStatus) {
            expect(approvalStatus).toEqual(UserManager.ApproveUserStatusEnum.USER_DOES_NOT_EXIST);
            done();
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

});

describe("UserManager sendForgotPasswordEmail", function() {
    var user;
    var password = 'test';
    var firstName = 'John';

    beforeEach(function() {
        user = {
            firstName: firstName,
            lastName: "Appleseed",
            email: magnetId.v1()+'28@magnet.com',
            companyName: "Apple Inc.",
            password: password,
            roleWithinCompany: 'Software Engineer',
            country: 'No Country For Old Men'
        };
    });

    it('should fail if magnetId is invalid', function(done){
        UserManager.sendForgotPasswordEmail({
            email: 'invalid email address'
        }, function(status, user) {
            expect(status.key).toEqual('USER_DOES_NOT_EXIST');
            done();
        });
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, registeredUser) {
            UserManager.approveUser({magnetId: registeredUser.magnetId}, false, function(approvalStatus, approvedUser) {
                user.magnetId = registeredUser.magnetId;
                UserManager.becomeDeveloper(user, function(status, u) {
                    UserManager.sendForgotPasswordEmail({email: u.email}, function(sendForgotPassword) {
                        u.reload().success(function() {
                            expect(u.passwordResetToken).not.toBeNull();
                            expect(sendForgotPassword).toEqual(UserManager.SendForgotPasswordEmailEnum.EMAIL_SUCCESSFUL);
                            // Clean up
                            u.destroy().success(function() {
                                done();
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
            email: magnetId.v1()+'29@magnet.com',
            companyName: "Apple Inc.",
            password: password,
            roleWithinCompany: 'Software Engineer',
            country: 'No Country For Old Men'
        };
    });

    it('should fail if magnetId is invalid', function(done){
        UserManager.resetPassword({
            passwordResetToken: 'invalid password reset token'
        }, function(status, user) {
            expect(status.key).toEqual('USER_DOES_NOT_EXIST');
            done();
        });
    });

    it("should succeed if the input is valid", function(done) {
        UserManager.registerGuest(user, false, function(registrationStatus, registeredUser) {
            user.magnetId = registeredUser.magnetId;
            UserManager.becomeDeveloper(user, function(status, u) {
                UserManager.sendForgotPasswordEmail({email: u.email}, function(sendForgotPassword) {
                    u.reload().success(function() {
                        UserManager.resetPassword({password: 'newPassword', passwordResetToken: u.passwordResetToken}, function(status, user) {
                            u.reload().success(function() {
                                expect(bcrypt.compareSync('newPassword', u.password)).toBeTruthy();
                                expect(u.passwordResetToken).toBeNull();
                                // Clean up
                                u.destroy().success(function(e) {
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

describe('UserManager checkAuthority', function(){
    var app, req, res, header, send, redirect;

    beforeEach(function(){
        header = {}, send = {}, redirect = '';
        // some mocks
        req = {
            session : {
                touch : function(){}
            }
        };
        res = {
            header : function(){
                header[arguments[0]] = arguments[1];
            },
            send : function(){
                send.body = arguments[0];
                send.code = arguments[1];
            },
            redirect : function(input){
                redirect = arguments[0];
            }
        };
    });

    it('should redirect users and store an entry point for unauthenticated page requests', function(done){
        req.url = '/get-started/';
        UserManager.checkAuthority(['admin', 'developer'], false)(req, res);
        expect(redirect).toEqual('/');
        expect(req.session.entryPoint).toEqual(req.url);
        done();
    });

    it('should protect APIs for unauthenticated API requests', function(done){
        UserManager.checkAuthority(['admin', 'developer'], true)(req, res);
        expect(send.body).toEqual('session-expired');
        expect(send.code).toEqual(278);
        done();
    });

    it('should block deactivated page requests', function(done){
        req.session.user = {
            activated : false
        };
        req.url = '/get-started/';
        UserManager.checkAuthority(['admin', 'developer'], false)(req, res);
        expect(redirect).toEqual('/?status=locked');
        expect(req.session.entryPoint).toEqual(req.url);
        done();
    });

    it('should fail to authenticate given invalid basic auth header', function(done){
        req.session.user = {
            userType  : 'approved',
            activated : true
        };
        req.headers = {
            authorization : 'invalid'
        };
        UserManager.checkAuthority(['admin', 'developer'], true, null, true)(req, res);
        expect(send.body).toEqual('invalid-login');
        expect(send.code).toEqual(401);
        done();
    });

    it('should fail to authenticate given incorrect basic auth credentials', function(done){
        req.session.user = {
            userType  : 'approved',
            activated : true
        };
        req.headers = {
            authorization : 'Basic aW52YWxpZDp1c2Vy'
        };
        var resTmp = {
            header : function(){
                header[arguments[0]] = arguments[1];
            },
            send : function(){
                expect(arguments[0]).toEqual('invalid-login');
                expect(arguments[1]).toEqual(401);
                done();
            },
            redirect : function(input){
                redirect = arguments[0];
            }
        };
        UserManager.checkAuthority(['admin', 'developer'], true, null, true)(req, resTmp);
    });

    it('should block deactivated API requests', function(done){
        req.session.user = {
            activated : false
        };
        UserManager.checkAuthority(['admin', 'developer'], true)(req, res);
        expect(send.body).toEqual('account-locked');
        expect(send.code).toEqual(279);
        done();
    });

    it('should block activated users of the wrong type', function(done){
        req.session.user = {
            userType  : 'approved',
            activated : true
        };
        UserManager.checkAuthority(['admin', 'developer'], true)(req, res);
        expect(send.body).toEqual('session-expired');
        expect(send.code).toEqual(278);
        done();
    });

    it('should authenticate given valid basic auth header', function(done){
        var user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : magnetId.v1()+'1@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
        UserManager.create(user, function(e, createdUser){
            expect(createdUser.firstName).toEqual(user.firstName);
            expect(createdUser.userType).toEqual(user.userType);
            expect(createdUser.email).toEqual(user.email);
            req.session.user = {
                userType  : 'approved',
                activated : true
            };
            req.headers = {
                authorization : 'Basic '+(new Buffer(user.email+':wheatale').toString('base64'))
            };
            var resTmp = {
                header : function(){
                    header[arguments[0]] = arguments[1];
                },
                send : function(){
                    expect(arguments[0]).toEqual('failed-test');
                    done();
                },
                redirect : function(input){
                    redirect = arguments[0];
                }
            };
            var continuedRouting = false;
            UserManager.checkAuthority(['admin', 'developer'], true, null, true)(req, resTmp, function(){
                continuedRouting = true;
                expect(continuedRouting).toEqual(true);
                done();
            });
        });
    });

    it('should continue routing for an activated user of the correct type for route requests', function(done){
        req.session.user = {
            userType  : 'admin',
            activated : true
        };
        var continuedRouting = false ,next = function(){
            continuedRouting = true;
        };
        UserManager.checkAuthority(['admin', 'developer'], false)(req, res, next);
        expect(continuedRouting).toEqual(true);
        done();
    });

    it('should continue routing for an activated user of the correct type for API requests', function(done){
        req.session.user = {
            userType  : 'developer',
            activated : true
        };
        var continuedRouting = false ,next = function(){
            continuedRouting = true;
        };
        UserManager.checkAuthority(['admin', 'developer'], true)(req, res, next);
        expect(continuedRouting).toEqual(true);
        expect(header['Cache-Control']).toEqual('no-cache, no-store, must-revalidate');
        expect(header['Pragma']).toEqual('no-cache');
        expect(header['Expires']).toEqual(0);
        done();
    });

});

describe('UserManager create', function(){
    var _user;

    beforeEach(function(){
        _user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : 'demouser@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
    });

    it('should fail given an invalid user object', function(done){
        UserManager.create('', function(e, user){
            expect(e).toEqual('invalid-user-object');
            done();
        });
    });

    it('should create a user in the database', function(done){
        _user.email = magnetId.v1()+'1@magnet.com';
        UserManager.create(_user, function(e, user){
            expect(user.firstName).toEqual(_user.firstName);
            expect(user.userType).toEqual(_user.userType);
            expect(user.email).toEqual(_user.email);
            done();
        });
    });

    it('should fail if a user of the same email exists', function(done){
        UserManager.create(_user, function(){
            UserManager.create(_user, function(e, user){
                expect(e).toEqual('user-exists');
                done();
            });
        });
    });

});

describe('UserManager read', function(){
    var _user;

    beforeEach(function(){
        _user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : 'demouser@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
    });

    it('should fail given a null value', function(done){
        UserManager.read(null, false, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should fail given an invalid magnetId', function(done){
        UserManager.read('invalid-id', false, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should return full user object if authorized', function(done){
        _user.email = magnetId.v1()+'4@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.read(user.magnetId, false, function(e, user){
                expect(user.firstName).toEqual(_user.firstName);
                expect(user.userType).toEqual(_user.userType);
                expect(user.email).toEqual(_user.email);
                done();
            });
        });
    });

    it('should return only email if not authorized', function(done){
        _user.email = magnetId.v1()+'5@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.read(user.magnetId, true, function(e, user){
                expect(user.firstName).toBeUndefined();
                expect(user.userType).toBeUndefined();
                expect(user.email).toEqual(_user.email);
                done();
            });
        });
    });

});

describe('UserManager readById', function(){
    var _user;

    beforeEach(function(){
        _user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : 'demouser@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
    });

    it('should fail given a null value', function(done){
        UserManager.readById(null, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should fail given an invalid magnetId', function(done){
        UserManager.readById('', function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should return full user object if authorized', function(done){
        _user.email = magnetId.v1()+'6@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.readById(user.id, function(e, user){
                expect(user.firstName).toEqual(_user.firstName);
                expect(user.userType).toEqual(_user.userType);
                expect(user.email).toEqual(_user.email);
                done();
            });
        });
    });

});

describe('UserManager update', function(){
    var _user;

    beforeEach(function(){
        _user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : 'demouser@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
    });

    it('should fail to update a user password if old password is not correct', function(done){
        _user.email = magnetId.v1()+'9@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.update({email : user.email}, {
                oldpass : 'incorrect-password',
                newpass : 'lager'
            }, function(e, updatedUser){
                expect(e).toEqual('old-pass-not-match');
                done();
            });
        });
    });

    it('should fail given an invalid user session email address', function(done){
        UserManager.update({email : 'nonexistent-email@magnet.com'}, {
            oldpass : 'wheatale',
            newpass : 'lager'
        }, function(e){
            expect(e).toEqual('user-not-found');
            done();
        });
    });

    it('should update a user in the database', function(done){
        _user.email = magnetId.v1()+'7@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.update({email : user.email}, {
                firstName : 'Gordon',
                lastName  : 'Biersch'
            }, function(e, user){
                expect(user.firstName).toEqual('Gordon');
                expect(user.lastName).toEqual('Biersch');
                done();
            });
        });
    });

    it('should update a user password in the database', function(done){
        _user.email = magnetId.v1()+'8@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.update({email : user.email}, {
                oldpass : 'wheatale',
                newpass : 'lager'
            }, function(e, updatedUser){
                bcrypt.compare('lager', updatedUser.password, function(e, isPasswordCorrect){
                    expect(isPasswordCorrect).toEqual(true);
                    done();
                });
            });
        });
    });

});

describe('UserManager setActivation', function(){
    var _user;

    beforeEach(function(){
        _user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : 'demouser@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
    });

    it('should return an error if the user does not exist', function(done){
        UserManager.setActivation(null, true, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should deactivate a user', function(done){
        _user.email = magnetId.v1()+'10@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.setActivation(user.magnetId, false, function(e, updatedUser){
                expect(updatedUser.activated).toEqual(false);
                done();
            });
        });
    });

    it('should activate a user', function(done){
        _user.email = magnetId.v1()+'11@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.setActivation(user.magnetId, true, function(e, updatedUser){
                expect(updatedUser.activated).toEqual(true);
                done();
            });
        });
    });

});

describe('UserManager validateAndSendCompleteRegistrationEmail', function(){
    var _user;

    beforeEach(function(){
        _user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : 'demouser@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
    });

    it('should return an error if the user does not exist', function(done){
        UserManager.validateAndSendCompleteRegistrationEmail(null, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should not send an email for a user that is not of type "approved"', function(done){
        _user.email = magnetId.v1()+'14@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.validateAndSendCompleteRegistrationEmail(user.magnetId, function(e){
                expect(e).toEqual('not-approved-user');
                done();
            });
        });
    });

    it('should send a complete registration email', function(done){
        _user.email = magnetId.v1()+'15@magnet.com';
        _user.userType = 'approved';
        UserManager.create(_user, function(e, user){
            UserManager.validateAndSendCompleteRegistrationEmail(user.magnetId, function(e){
                expect(e).toBeUndefined();
                done();
            });
        });
    });

    it('should send a complete registration email which went through the admin invite registration process', function(done){
        var adminUserObj = _user;
        adminUserObj.email = magnetId.v1()+'16@magnet.com';
        adminUserObj.userType = 'admin';
        UserManager.create(_.extend({}, adminUserObj), function(e, adminUser){
            _user.email = magnetId.v1()+'17@magnet.com';
            _user.userType = 'approved';
            _user.inviterId = adminUser.id;
            UserManager.create(_user, function(e, user){
                UserManager.validateAndSendCompleteRegistrationEmail(user.magnetId, function(e){
                    expect(e).toBeUndefined();
                    done();
                });
            });
        });
    });

});

describe('UserManager delete', function(){
    var _user;

    beforeEach(function(){
        _user = {
            firstName   : 'Pyramid',
            lastName    : 'Hefeweizen',
            email       : 'demouser@magnet.com',
            userType    : 'developer',
            password    : 'wheatale',
            companyName : 'beer'
        };
    });

    it('should return an error if the user does not exist', function(done){
        UserManager.delete(null, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should delete a user from the database', function(done){
        _user.email = magnetId.v1()+'13@magnet.com';
        UserManager.create(_user, function(e, user){
            UserManager.delete(user.magnetId, function(e){
                UserManager.read(user.magnetId, true, function(e, out){
                    expect(out).toBeUndefined();
                    done();
                });
            });
        });
    });

});

describe('UserManager getInvitedUsers', function(){
    var _user;

    beforeAll(function(done){
        _user = {
            firstName    : 'Pyramid',
            lastName     : 'Hefeweizen',
            email        : magnetId.v1()+'19@magnet.com',
            userType     : 'developer',
            password     : 'wheatale',
            companyName  : 'beer'
        };
        UserManager.create(_user, function(e, user){
            expect(e).toBeNull();
            _user = user;
            done();
        });
    });

    it('should return an error if the user does not exist', function(done){
        UserManager.getInvitedUsers(null, function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should return a list of invited users', function(done){
        var invitedUserEmail = magnetId.v1()+'20@magnet.com';
        UserManager.registerGuest({
            email        : invitedUserEmail,
            inviterId    : _user.id,
            invitedEmail : invitedUserEmail
        }, true, function(status){
            expect(status.key).toEqual('REGISTRATION_SUCCESSFUL');
            UserManager.getInvitedUsers(_user.magnetId, function(e, invitedUsers){
                expect(e).toBeNull();
                expect(invitedUsers[0].invitedEmail).toEqual(invitedUserEmail);
                done();
            });
        });
    });

});

describe('UserManager adminResetPassword', function(){
    var _user = {
        userType     : 'developer',
        firstName    : 'Blue',
        lastName     : 'Moon',
        email        : magnetId.v1()+'24@magnet.com',
        password     : 'admin'
    };

    beforeAll(function(done){
        UserManager.create(_user, function(e, newUser){
            expect(e).toBeNull();
            _user = newUser;
            done();
        });
    });

    it('should return an error if the user does not exist', function(done){
        UserManager.adminResetPassword('invalid-id', function(e){
            expect(e).toEqual('user-not-exist');
            done();
        });
    });

    it('should reset the password', function(done){
        orm.model('User').find({
            where      : {
                magnetId : _user.magnetId
            }
        }).then(function(user){
            if(user){
                var password = user.password;
                UserManager.adminResetPassword(_user.magnetId, function(e){
                    expect(e).toBeNull();
                    orm.model('User').find({
                        where      : {
                            magnetId : _user.magnetId
                        }
                    }).then(function(updatedUser){
                        if(updatedUser){
                            expect(password).not.toEqual(updatedUser.password);
                            done();
                        }else{
                            expect('user-not-found2').toEqual('failed-test');
                            done();
                        }
                    }).catch(function(e){
                        expect(e).toEqual('failed-test');
                        done();
                    });
                });
            }else{
                expect('user-not-found').toEqual('failed-test');
                done();
            }
        }).catch(function(e){
            expect(e).toEqual('failed-test');
            done();
        });
    });

});
