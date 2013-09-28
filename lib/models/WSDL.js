var orm = require('../orm')
    , Seq = orm.Seq();

module.exports = {
    model : {
        url      : Seq.STRING,
        magnetId : {
            type     : Seq.STRING,
            unique   : true,
            validate : { isUUID : 1 }
        }
    },
    relations : [{
        type  : 'belongsTo',
        model : 'Project',
        constraints : {
            onDelete : 'cascade'
        }
    }]
};
