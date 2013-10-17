var orm = require('./orm');

var Queries = function(){};

Queries.prototype.findAll = function(req, callback){
    // TODO: this will fail if plural model doesnt end in 's'
    var modelName = req.params.model[0].toUpperCase() + req.params.model.slice(1).slice(0, - 1);
    var queryObj = {}, order = [], where = [], push = function(input, dir){
        if(typeof input == typeof ''){
            order.push('`'+input+'` '+(dir == 'ASC' ? 'ASC' : 'DESC'));
        }else{
            for(var i=0;i<input.length;++i){
                order.push('`'+input[i]+'` '+(dir == 'ASC' ? 'ASC' : 'DESC'));
            }
        }
    }
    for(var query in req.query){
        switch(query){
            case '_magnet_ascending' : push(req.query[query], 'ASC'); break;
            case '_magnet_descending' : push(req.query[query], 'DESC'); break;
            case '_magnet_max_results' : queryObj.limit = req.query[query]; break;
            case '_magnet_page' : queryObj.offset = req.query[query]; break;
            default : where.push('`'+query+'` '+(req.query[query].indexOf('%') != -1 ? 'LIKE' : '=')+' "'+req.query[query]+'"'); break;
        }
    }
    queryObj.order = order.join(', ');
    queryObj.where = where.join(' AND ');
    winston.log('Models: retrieving collection with query object: ',queryObj);
    orm.model(modelName).findAll(queryObj).success(function(col){
        callback(col);
    }).error(function(e){
        winston.error('Models: error retrieving collection: ',e);
        callback('error-retrieving-collection');
    });
};

Queries.prototype.find = function(req, callback){
    var modelName = req.params.model[0].toUpperCase() + req.params.model.slice(1).slice(0, - 1);
    winston.log('Models: retrieving model "'+req.params.model+'" with id "'+req.params.id+'"');
    orm.model(modelName).find({
        where : {
            magnetId : req.params.id
        }
    }).success(function(model){
        callback(model);
    }).error(function(e){
        winston.error('Models: error retrieving model: ',e);
        callback('error-retrieving-model');
    });
};

module.exports = new Queries();