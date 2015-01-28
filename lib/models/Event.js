var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        magnetId : {
            type     : Seq.STRING,
            unique   : true,
            validate : {
                isUUID : 1
            }
        },
        level : {
            type     : Seq.STRING,
            validate : {
                notEmpty : true
            }
        },
        UserId : {
            type     : Seq.INTEGER,
            validate : {
                notEmpty : true
            }
        },
        message : {
            type : Seq.STRING
        },
        targetModel : {
            allowNull : true,
            type      : Seq.STRING
        },
        targetId : {
            allowNull : true,
            type      : Seq.INTEGER
        }
    }
};