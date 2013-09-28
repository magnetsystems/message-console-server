var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        // TODO: Add tracking and credentials
        magnetId: {
            type: Seq.STRING,
            unique: true,
            validate: { isUUID: 1 }
        },
        firstName : {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        lastName : {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        email : {
            type: Seq.STRING,
            unique: true,
            validate: { isEmail: true }
        },
        dateAcceptedEULA : Seq.DATE,
        password         : Seq.STRING,
        country          : Seq.STRING,
        companyName : {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        roleWithinCompany : {
            type: Seq.STRING
            // TODO: we want this to be required, but the /rest/startRegistration API does not pass this,
            // so need to figure out a way
//            validate: { notEmpty: true }
        },
        country : {
            type: Seq.STRING
            // TODO: we want this to be required, but the /rest/startRegistration API does not pass this,
            // so need to figure out a way
//            validate: { notEmpty: true }
        },
        userType         : Seq.STRING
    },
    relations : [{
        type  : 'hasMany',
        model : 'CloudAccount'
    }, {
        type  : 'hasMany',
        model : 'Project'
    }],
    options : {
        //freezeTableName : true
    }
};