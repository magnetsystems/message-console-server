var UserManager = require('../UserManager')
, magnetId = require('node-uuid')
, orm = require('../orm');

var SetupAdmin = function(){
    // create a test user if it does not already exist
    UserManager.create({
        userName  : "manager1",
        email     : "manager1@magnet.com",
        firstName : "Manager",
        lastName  : "One",
        company   : "Magnet",
        password  : "test",
        userType  : 'admin',
        magnetId  : magnetId.v1()
    }, function(e){
        if(e){
            console.error('User: error creating test user: '+e);
        }else{
            console.info('User: test user created: manager1@magnet.com/test');
        }
    });
};

new SetupAdmin();