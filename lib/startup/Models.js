var UserManager = require('../UserManager')
, orm = require('../orm')
, magnetId = require('node-uuid');

var StartupModels = function(){};

StartupModels.prototype.setupAdmin = function(callback){
    orm.model('User').find({
        where : {
            email : "manager1@magnetapi.com"
        }
    }).success(function(user){
        if(!user){
            // create a test user if it does not already exist
            UserManager.create({
                email       : "manager1@magnetapi.com",
                firstName   : "Manager",
                lastName    : "One",
                companyName : "Magnet Systems, Inc.",
                password    : "test",
                userType    : 'admin',
                magnetId    : magnetId.v1()
            }, function(e){
                if(e){
                    console.error('User: error creating test user: '+e);
                }else{
                    console.info('User: test user created: manager1@magnetapi.com/test');
                    callback();
                }
            });
        }
    });
};

module.exports = new StartupModels();