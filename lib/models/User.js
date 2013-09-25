var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        // TODO: Add tracking and credentials
        magnetId: {
            type: Seq.STRING,
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
            validate: { isEmail: true }
        },
        dateAcceptedEULA : Seq.DATE,
        password         : Seq.STRING,
        country          : Seq.STRING,
        companyName : {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        userType         : Seq.STRING
    },
    relations : {
        hasMany : "CloudAccount"
    },
    options : {
        //freezeTableName : true
    }
};