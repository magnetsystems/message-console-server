var ContentManagement = require("../lib/ContentManagement")
 , Helper = require('./Helper')
 , orm = require('../lib/orm')
, fs = require('fs')
, magnetId = require('node-uuid')
, _ = require('underscore');

jasmine.getEnv().defaultTimeoutInterval = 30000;

describe('ContentManagement', function(){

    describe('getPageList', function(){

        it("output matches expected page list", function(done) {
            ContentManagement.getPageList(function(e, ary){
                var out = JSON.stringify(ary);
                expect(ary.length).toEqual(3);
                expect(out).toContain('{"filename":"Basic-Template","folder":"email","noLayout":true}');
                expect(out).toContain('{"filename":"Forgot-Password","folder":"email","noLayout":true}');
                expect(out).toContain('{"filename":"Invite-Confirmation","folder":"email","noLayout":true}');
                done();
            });
        });

    });

    describe('traverse', function(){

        it("output fails if directory does not exist", function(done) {
            ContentManagement.traverse('invalid-directory', function(e, ary){
                expect(JSON.stringify(e)).toEqual('{"errno":34,"code":"ENOENT","path":"invalid-directory"}');
                expect(ary).toBeUndefined();
                done();
            });
        });

        it("output matches expected page list", function(done) {
            ContentManagement.traverse(ContentManagement.pageDir, function(e, ary){
                var out = JSON.stringify(ary);
                expect(ary.length).toEqual(3);
                expect(out).toContain('{"filename":"Basic-Template","folder":"email","noLayout":true}');
                expect(out).toContain('{"filename":"Forgot-Password","folder":"email","noLayout":true}');
                expect(out).toContain('{"filename":"Invite-Confirmation","folder":"email","noLayout":true}');
                done();
            });
        });

    });

    describe('viewPageContent', function(){

        it("should return error given incorrect filename", function(done) {
            var reqMock = {
                body : {
                    folder : 'email',
                    filename : 'invalid-file'
                },
                session : {
                    user : {}
                }
            };
            ContentManagement.viewPageContent(reqMock, function(e, tmpl){
                expect(e).toEqual('no-file-exists');
                expect(tmpl).toBeUndefined();
                done();
            });
        });

        it("should return preview mode tmpl", function(done) {
            var reqMock = {
                body : {
                    folder : 'email',
                    filename : 'Basic-Template',
                    isPreview : true
                },
                session : {
                    user : {}
                }
            };
            ContentManagement.viewPageContent(reqMock, function(e, tmpl){
                expect(tmpl).toContain('<html xmlns="http://www.w3.org/1999/xhtml">');
                done();
            });
        });

        it("should return forgot password tmpl", function(done) {
            var reqMock = {
                body : {
                    folder : 'email',
                    filename : 'Forgot-Password'
                },
                session : {
                    user : {}
                }
            };
            ContentManagement.viewPageContent(reqMock, function(e, tmpl){
                expect(tmpl).toContain('To reset your password, please click the following button:');
                done();
            });
        });

        it("should return basic template tmpl", function(done) {
            var reqMock = {
                body : {
                    folder : 'email',
                    filename : 'Basic-Template'
                },
                session : {
                    user : {}
                }
            };
            ContentManagement.viewPageContent(reqMock, function(e, tmpl){
                expect(tmpl).toContain('<html xmlns="http://www.w3.org/1999/xhtml">');
                done();
            });
        });

        it("should return forgot password tmpl", function(done) {
            var reqMock = {
                body : {
                    folder : 'email',
                    filename : 'Invite-Confirmation'
                },
                session : {
                    user : {}
                }
            };
            ContentManagement.viewPageContent(reqMock, function(e, tmpl){
                expect(tmpl).toContain('To activate your account, please click the following button:');
                done();
            });
        });

    });

    describe('updateSinglePage', function(){

        var testFile = './tmp/testfile.ejs';

        beforeAll(function(done){
            fs.mkdir('./tmp', function(e){
                if(!e || (e && e.code === 'EEXIST')){
                    fs.writeFile(testFile, 'original-content', function(e){
                        if(e){
                            expect(e).toEqual('failed-test');
                            done();
                        }else{
                            done();
                        }
                    });
                } else {
                    expect(e).toEqual('failed-test');
                    done();
                }
            });
        });

        it("should fail given invalid filename", function(done) {
            var reqMock = {
                body : {
                    folder : 'email',
                    filename : 'invalid-filename',
                    data : 'new-data'
                }
            };
            ContentManagement.updateSinglePage(reqMock, function(e){
                expect(e).toEqual('no-file-exists');
                done();
            });
        });

        it("should update contents of a file", function(done) {
            var reqMock = {
                body : {
                    filename : 'testfile',
                    data : 'new-data'
                }
            };
            ContentManagement.pageDir = './tmp';
            ContentManagement.updateSinglePage(reqMock, function(e){
                expect(e).toBeUndefined();
                fs.readFile(testFile, 'utf8', function(e, txt){
                    expect(e).toBeNull();
                    expect(txt).toEqual(reqMock.body.data);
                    done();
                });
            });
        });

        afterAll(function(done){
            fs.unlink(testFile, function (e) {
                done();
            });
        });

    });

});


