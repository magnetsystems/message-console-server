var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        magnetId : {
            type         : Seq.UUID,
            unique       : true,
            defaultValue : Seq.UUIDV1
        },
        level : {
            allowNull : true,
            type      : Seq.STRING
        },
        UserId : {
            allowNull : true,
            type      : Seq.STRING
        },
        message : {
            allowNull : true,
            type      : Seq.STRING
        },
        targetModel : {
            allowNull : true,
            type      : Seq.STRING
        },
        targetId : {
            allowNull : true,
            type      : Seq.STRING
        }
    }
};