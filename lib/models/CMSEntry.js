var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        identifier : {
            type     : Seq.STRING,
            validate : {
                notEmpty : true
            }
        }
    },
    relations : [{
        type  : 'belongsTo',
        model : 'CMSPage',
        constraints : {
            onDelete : 'cascade'
        }
    }]
};