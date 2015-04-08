var UserManager = require('../lib/UserManager')
, orm = require('../lib/orm')
, magnetId = require('node-uuid')
, winston = require('winston')
, winstonSequelize = require('../lib/winston-sequelize').WinstonSequelize;

jasmine.getEnv().defaultTimeoutInterval = 30000;

var id = magnetId.v1();
var password = '$2a$10$.zrAuu55WS8ntazOHo6KKuY0xDkarNOmxLoGRPGrc3hl1iNprp7si'; // 'admin'
var user1 = {
    magnetId  : id,
    firstName : 'user',
    lastName  : 'four',
    email     : id+'@magnet.com',
    userType  : 'developer',
    activated : true,
    password  : password
};

describe('winston-sequelize', function(){

    beforeAll(function(done){
        ENV_CONFIG.DatabaseLog.enabled = false;
        try{
            winston.remove({
                name : 'winston-sequelize'
            });
        }catch(e){}
        orm.setup('./lib/models', function(){
            orm.model('User').create(user1).then(function(res1){
                expect(res1.lastName).toEqual(user1.lastName);
                user1.id = res1.id;
                done();
            }).catch(function(e){
                expect(e).toEqual('failed-test');
                done();
            });
        });
    });

    describe('transport', function(){

        it('should add to winston', function(done){
            winston.add(winston.transports.WinstonSequelize);
            done();
        });

        it('should remove and re-add transport', function(done){
            var logger = new (winston.Logger)({
                transports : [
                    new (winston.transports.WinstonSequelize)({
                        level            : 'info',
                        handleExceptions : false,
                        silent           : true
                    })
                ]
            });
            done();
        });

    });

    describe('log', function(){

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
                userId : user1.id
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

        it('should log to db', function(done){
            var message = 'Testing0: test of logging at '+new Date();
            winston.info(message, {}, function(){
                orm.model('Event').find({
                    where : {
                        message : message
                    }
                }).success(function(event){
                    expect(event.message).toEqual(message);
                    done();
                }).error(function(e){
                    expect(e).toEqual('failed-test');
                    done();
                });
            });
        });

        it('should log an event if userId is present', function(done){
            var message = 'Testing3: test of log out at '+new Date();
            winston.info(message, {
                userId : user1.id
            }, function(){
                orm.model('Event').find({
                    where : {
                        message : message
                    }
                }).success(function(event){
                    expect(event).not.toBeNull();
                    expect(event.message).toEqual(message);
                    expect(parseInt(event.UserId)).toEqual(user1.id);
                    done();
                }).error(function(e){
                    expect(e).toEqual('failed-test');
                    done();
                });
            });
        });

        it('should log an info event with additional event target metadata', function(done){
            var message = 'Testing4: test of log out at '+new Date();
            var metadata = {
                userId      : user1.id,
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
                    expect(parseInt(event.targetId)).toEqual(metadata.targetId);
                    expect(event.targetModel).toEqual(metadata.targetModel);
                    expect(parseInt(event.UserId)).toEqual(user1.id);
                    expect(event.level).toEqual('info');
                    done();
                }).error(function(e){
                    expect(e).toEqual('failed-test');
                    done();
                });
            });
        });

    });

});

