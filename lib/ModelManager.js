var orm = require('./orm')
, magnetId = require('node-uuid');

var ModelManager = function(){};

ModelManager.prototype.findAll = function(req, callback){
    var modelName = req.params.model[0].toUpperCase() + req.params.model.slice(1).slice(0, - 1);
    var queryObj = {}, order = [], where = [], push = function(input, dir){
        if(typeof input == typeof ''){
            order.push('`'+input+'` '+(dir == 'ASC' ? 'ASC' : 'DESC'));
        }else{
            for(var i=0;i<input.length;++i){
                order.push('`'+input[i]+'` '+(dir == 'ASC' ? 'ASC' : 'DESC'));
            }
        }
    };
    queryObj.limit = 10;
    for(var query in req.query){
        if(typeof query == 'string' && typeof req.query[query] === 'string'){
            switch(query){
                case '_magnet_ascending' : push(req.query[query], 'ASC'); break;
                case '_magnet_descending' : push(req.query[query], 'DESC'); break;
                case '_magnet_page' : queryObj.offset = parseInt(req.query[query]); break;
                case '_magnet_page_size' : queryObj.limit = parseInt(req.query[query]); break;
                default : where.push('`'+query+'` '+(req.query[query].indexOf('%') != -1 ? 'LIKE' : '=')+' "'+req.query[query]+'"'); break;
            }
        }
    }
    queryObj.order = order.join(', ');
    queryObj.where = where.join(' AND ');
    winston.silly('Models: retrieving collection with query object: ',queryObj);
    orm.model(modelName).findAndCountAll(queryObj).then(function(res){
        callback({
            paging : {
                start : queryObj.offset || 0,
                rpp   : queryObj.limit,
                total : res.count
            },
            rows : res.rows
        });
    }).catch(function(e){
        winston.error('Models: error retrieving collection: ',e);
        callback('error-retrieving-collection');
    });
};

ModelManager.prototype.find = function(req, callback){
    var modelName = req.params.model[0].toUpperCase() + req.params.model.slice(1).slice(0, - 1);
    winston.silly('Models: retrieving model "'+req.params.model+'" with id "'+req.params.id+'"');
    orm.model(modelName).find({
        where : {
            magnetId : req.params.id
        }
    }).then(function(model){
        callback(model);
    }).catch(function(e){
        winston.error('Models: error retrieving model: ',e);
        callback('error-retrieving-model');
    });
};

ModelManager.prototype.update = function(req, modelObj, callback){
    var modelName = req.params.model[0].toUpperCase() + req.params.model.slice(1).slice(0, - 1);
    winston.verbose('Models: updating model "'+req.params.model+'" with id "'+req.params.id+'"');
    orm.model(modelName).find({
        where : {
            magnetId : req.params.id
        }
    }).then(function(model){
        if(model){
            delete modelObj.updatedAt;
            delete modelObj.createdAt;
            model.updateAttributes(modelObj).then(function(){
                winston.info('Models: user "'+req.session.user.firstName+' '+req.session.user.lastName+'"('+req.session.user.id+') updated a '+modelName+' '+(model.firstName ? '"'+model.firstName+' '+model.lastName+'"' : '')+'('+model.id+') successfully at: '+new Date()+' with data: "'+JSON.stringify(modelObj)+'"', {
                    userId      : req.session.user.id,
                    targetModel : modelName,
                    targetId    : model.id
                });
                callback(null, model);
            }).catch(function(e){
                winston.error('Models: error updating model: ',e);
                callback('error-updating-model');
            });
        }else{
            winston.error('Models: error retrieving model.');
            callback('model-not-found');
        }
    }).catch(function(e){
        winston.error('Models: error retrieving model: ',e);
        callback('error-retrieving-model');
    });
};

ModelManager.prototype.create = function(req, modelObj, callback){
    var modelName = req.params.model[0].toUpperCase() + req.params.model.slice(1).slice(0, - 1);
    modelObj.magnetId = magnetId.v1();
    orm.model(modelName).create(modelObj).then(function(model){
        callback(null, model);
    }).catch(function(e){
        winston.error(modelName+': creation failed: ', e);
        callback('create-model-failed');
    });
};

ModelManager.prototype.delete = function(req, callback){
    var modelName = req.params.model[0].toUpperCase() + req.params.model.slice(1).slice(0, - 1);
    orm.model(modelName).find({
        where : {
            magnetId : req.params.id
        }
    }).then(function(model){
        model.destroy().then(function(){
            callback(null);
        }).catch(function(e){
            winston.error(modelName+': deletion failed: ', e);
            callback('delete-model-failed');
        });
    }).catch(function(e){
        winston.error(modelName+': error retrieving model: ',e);
        callback('error-retrieving-model');
    });
};

module.exports = new ModelManager();