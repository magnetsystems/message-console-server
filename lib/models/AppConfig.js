var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        magnetId : {
            type     : Seq.STRING,
            unique   : true,
            validate : { isUUID : 1 }
        },
        skipAdminApproval : {
            type         : Seq.BOOLEAN,
            defaultValue : false,
            validate     : { notEmpty : true }
        }
    }
};