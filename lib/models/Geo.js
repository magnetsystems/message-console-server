var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        long : {
            allowNull : true,
            type      : Seq.FLOAT(10, 6)
        },
        lat : {
            allowNull : true,
            type      : Seq.FLOAT(10, 6)
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
            type      : Seq.INTEGER
        },
        altitude : {
            allowNull : true,
            type      : Seq.INTEGER
        },
        appId : {
            allowNull : true,
            type      : Seq.STRING
        },
        stamp : {
            allowNull : true,
            type      : Seq.DATE
        }
    },
    options : {
        timestamps : false
    }
};