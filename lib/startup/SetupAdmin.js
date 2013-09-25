var UserManager = require('../UserManager')
, magnetId = require('node-uuid');

var SetupAdmin = function(){
    // create a test user if it does not already exist
    UserManager.create({
        email     : "manager1@magnet.com",
        firstName : "Manager",
        lastName  : "One",
        companyName   : "Magnet Systems, Inc.",
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