var orm = require('../orm')
    , Seq = orm.Seq();

module.exports = {
    model : {
        url : {
            type     : Seq.STRING,
            validate : {
                isUrl : true
            }
        },
        magnetId : {
            type     : Seq.STRING,
            unique   : true,
            validate : { isUUID : 1 }
        },
        serviceName : Seq.STRING,
        bindStyle   : Seq.STRING
    },
    relations : [{
        type  : 'belongsTo',
        model : 'Project',
        constraints : {
            onDelete : 'cascade'
        }
    }]
};
