var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        // TODO: Add tracking and credentials
        firstName : {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        lastName : {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        userName         : Seq.STRING,
        email : {
            type: Seq.STRING,
            validate: { isEmail: true }
        },
        dateAcceptedEULA : Seq.DATE,
        password         : Seq.STRING,
        country          : Seq.STRING,
        company          : Seq.STRING,
        userType         : Seq.STRING
    },
    relations : {
        //hasMany : "World"
    },
    options : {
        //freezeTableName : true
    }
};