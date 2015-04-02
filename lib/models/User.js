var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        magnetId : {
            type         : Seq.UUID,
            unique       : true,
            defaultValue : Seq.UUIDV1
        },
        firstName : {
            allowNull : true,
            type      : Seq.STRING
        },
        lastName : {
            allowNull : true,
            type      : Seq.STRING
        },
        email : {
            allowNull : true,
            type      : Seq.STRING,
            unique    : true,
            validate  : {
                isEmail : true
            }
        },
        dateAcceptedEULA  : Seq.DATE,
        password          : Seq.STRING,
        country           : Seq.STRING,
        userType          : Seq.STRING,
        roleWithinCompany : Seq.STRING,
        companyName : {
            allowNull : true,
            type      : Seq.STRING
        },
        inviterId : {
            allowNull : true,
            type      : Seq.INTEGER,
            validate : {
                isInt : true
            }
        },
        invitedEmail : {
            allowNull : true,
            type      : Seq.STRING,
            validate  : {
                isEmail : true
            }
        },
        passwordResetToken : {
            allowNull : true,
            unique    : true,
            type      : Seq.STRING
        },
        activated : {
            type         : Seq.BOOLEAN,
            defaultValue : true,
            validate     : {
                notEmpty : true
            }
        },
        hasMMXApp : {
            type         : Seq.BOOLEAN,
            defaultValue : false
        }
    },
    options : {
        //freezeTableName : true
    }
};