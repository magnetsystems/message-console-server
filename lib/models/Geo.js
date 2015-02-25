var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        long : {
            allowNull : true,
            type      : Seq.FLOAT
        },
        lat : {
            allowNull : true,
            type      : Seq.FLOAT
        },
        geohash : {
            allowNull : true,
            type      : Seq.STRING
        },
        deviceId : {
            allowNull : true,
            type      : Seq.STRING
        },
        userId : {
            allowNull : true,
            type      : Seq.STRING
        },
        appId : {
            allowNull : true,
            type      : Seq.STRING
        }
    }
};