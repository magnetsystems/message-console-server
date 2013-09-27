var orm = require('../orm')
    , Seq = orm.Seq();

module.exports = {
    model : {
        url      : Seq.STRING,
        magnetId : Seq.STRING
    }
};
