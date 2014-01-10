var orm = require('../orm')
    , Seq = orm.Seq();

module.exports = {
    model : {
        magnetId : {
            type     : Seq.STRING,
            unique   : true,
            validate : { isUUID : 1 }
        },
        subject : {
            type     : Seq.TEXT,
            validate : { notEmpty : true }
        },
        description : {
            type     : Seq.TEXT,
            validate : { notEmpty : true }
        },
        hyperlink : {
            type : Seq.TEXT
        },
        UserId : {
            type : Seq.INTEGER
        }
    }
};