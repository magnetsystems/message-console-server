var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        long : {
            allowNull : true,
            type      : Seq.STRING
        },
        lat : {
            allowNull : true,
            type      : Seq.STRING
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
        accuracy : {
            allowNull : true,
            type      : Seq.STRING
        },
        appId : {
            allowNull : true,
            type      : Seq.STRING
        },
        stamp : {
            allowNull : true,
            type      : Seq.STRING
        }
    }
};