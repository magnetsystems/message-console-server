var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        folder    : Seq.STRING,
        filename  : {
            type     : Seq.STRING,
            validate : {
                notEmpty : true
            }
        },
        content   : Seq.TEXT
    },
    relations : [{
        type  : 'hasMany',
        model : 'CMSEntry'
    }]
};