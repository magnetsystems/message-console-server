var UserManager = require('../lib/UserManager')
, orm = require('../lib/orm')
, magnetId = require('node-uuid')
, winston = require('winston')
, winstonSequelize = require('../lib/winston-sequelize').WinstonSequelize;

jasmine.getEnv().defaultTimeoutInterval = 30000;

var _user = {
    firstName   : 'Pyramid',
    lastName    : 'Hefeweizen',
    email       : magnetId.v1()+'@magnet.com',
    userType    : 'developer',
    password    : 'wheatale',
    companyName : 'beer'
};

describe('winston-sequelize database setup', function(){
    beforeAll(function(done){
        winston.add(winston.transports.WinstonSequelize, {
            level            : 'info',
            handleExceptions : false
        });
        orm.setup('./lib/models', function(){
            UserManager.create(_user, function(e, user){
                _user = user;
                expect(e).toBeNull();
                done();
            });
        });
    });
});

describe('winston-sequelize log', function(){

    it('should not log to db if acting user id is not present', function(done){
        var message = 'Testing0: test of log out at '+new Date();
        winston.info(message, {}, function(){
            orm.model('Event').find({
                where : {
                    message : message
                }
            }).success(function(event){
                expect(event).toBeNull();
                done();
            });
        });
    });

    it('should not log an event if winston-sequelize is configured to be silent', function(done){
        var logger = new (winston.Logger)({
            transports : [
                new (winston.transports.WinstonSequelize)({
                    level            : 'info',
                    handleExceptions : false,
                    silent           : true
                })
            ]
        });
        var message = 'Testing2: test of log out at '+new Date();
        logger.info(message, {
            userId : _user.id
        }, function(){
            orm.model('Event').find({
                where : {
                    message : message
                }
            }).success(function(event){
                expect(event).toBeNull();
                done();
            });
        });
    });

    it('should log an event if userId is present', function(done){
        var message = 'Testing3: test of log out at '+new Date();
        winston.info(message, {
            userId : _user.id
        }, function(){
            orm.model('Event').find({
                where : {
                    message : message
                }
            }).success(function(event){
                expect(event).not.toBeNull();
                expect(event.message).toEqual(message);
                expect(event.UserId).toEqual(_user.id);
                done();
            });
        });
    });

    it('should log an info event with additional event target metadata', function(done){
        var message = 'Testing4: test of log out at '+new Date();
        var metadata = {
            userId      : _user.id,
            targetId    : 1,
            targetModel : 'User'
        };
        winston.info(message, metadata, function(){
            orm.model('Event').find({
                where : {
                    message : message
                }
            }).success(function(event){
                expect(event).not.toBeNull();
                expect(event.message).toEqual(message);
                expect(event.targetId).toEqual(metadata.targetId);
                expect(event.targetModel).toEqual(metadata.targetModel);
                expect(event.UserId).toEqual(_user.id);
                expect(event.level).toEqual('info');
                done();
            });
        });
    });

});

