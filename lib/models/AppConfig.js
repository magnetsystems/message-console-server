var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        skipAdminApproval : {
            type         : Seq.BOOLEAN,
            defaultValue : false,
            validate     : { notEmpty : true }
        },
        homePageVideoID : {
            type         : Seq.STRING,
            defaultValue : ''
        },
        gitSyncInterval : {
            type         : Seq.INTEGER,
            defaultValue : 120
        }
    }
};