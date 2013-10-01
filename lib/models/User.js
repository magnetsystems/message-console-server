var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    level : 1,
    model : {
        magnetId: {
            type: Seq.STRING,
            unique: true,
            validate: { isUUID: 1 }
        },
        firstName : {
            allowNull: true,
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        lastName : {
            allowNull: true,
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        email : {
            allowNull: true,
            type: Seq.STRING,
            unique: true,
            validate: { isEmail: true }
        },
        dateAcceptedEULA : Seq.DATE,
        password         : Seq.STRING,
        country          : Seq.STRING,
        companyName : {
            allowNull: true,
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
        userType         : Seq.STRING,
        // Invitation details
        inviterId : {
            allowNull: true,
            type: Seq.INTEGER,
            validate: { isInt: true }
        },
        invitedEmail : {
            allowNull: true,
            type: Seq.STRING,
            validate: { isEmail: true }
        },
        passwordResetToken : {
            allowNull: true,
            unique: true,
            type: Seq.STRING,
            validate: { isUUID: 1 }
        }
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