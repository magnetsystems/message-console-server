var EmailService = require("../lib/EmailService")
 , Helper = require('./Helper');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe('EmailService', function(){

    describe('sendEmail', function(){

        it("should fail with invalid server email configuration", function(done) {
            EmailService.sendEmail({
                to      : 'my.email@magnet.com',
                subject : 'Test Email',
                html    : EmailService.renderTemplate({
                    main : 'Basic-Template',
                    sub  : 'Invite-Confirmation',
                    vars : {
                        emailTitle  : 'Test Email Title',
                        resourceUrl : 'http://test.com/resources',
                        url         : 'http://test.com/#/complete-register'
                    }
                }),
                success : function(msg){
                    expect(msg).toEqual('failed-test');
                    done();
                },
                error : function(e){
                    expect(e).toEqual('error-sending-email');
                    done();
                }
            });
        });

    });

    describe('renderTemplate', function(){

        it("should fail given invalid parameters", function(done) {
            var params = {};
            var out = EmailService.renderTemplate(params);
            expect(out).toEqual('');
            done();
        });

        it("should return correct payload without sub template", function(done) {
            var params = {
                main : 'Basic-Template',
                vars : {
                    emailTitle  : 'Test Without Sub',
                    resourceUrl : 'http://test.com/resources',
                    url         : 'http://test.com/#/complete-register'
                }
            };
            var out = EmailService.renderTemplate(params);
            expect(out).toContain('<title>Test Without Sub</title>');
            expect(out).not.toContain('To activate your account, please click the following button:');
            done();
        });

        it("should return correct payload with sub template", function(done) {
            var params = {
                main : 'Basic-Template',
                sub  : 'Invite-Confirmation',
                vars : {
                    emailTitle  : 'Test With Sub',
                    resourceUrl : 'http://test.com/resources',
                    url         : 'http://test.com/#/complete-register'
                }
            };
            var out = EmailService.renderTemplate(params);
            expect(out).toContain('<title>Test With Sub</title>');
            expect(out).toContain('To activate your account, please click the following button:');
            done();
        });

    });

});


