var filesystem = require('fs');
var models = {};
var relationships = {};

var singleton = function singleton(){
    var Sequelize = require('sequelize');
    var sequelize = null;
    var modelsPath = '';
    var me = this;

    this.setup = function(path, callback){
        modelsPath = path;
        this.callback = callback;
        sequelize = new Sequelize(
            ENV_CONFIG.Database.dbName,
            ENV_CONFIG.Database.username,
            ENV_CONFIG.Database.password,
            ENV_CONFIG.Database.params
        );
        init();
    }

    this.model = function(name){
        return models[name];
    }

    this.Seq = function(){
        return Sequelize;
    }

    function init(){
        filesystem.readdirSync(modelsPath).forEach(function(name){
            if(name.indexOf('.js') != -1){
                var modelName = name.substr(0, name.indexOf('.'));
                var object = require('.'+modelsPath+'/'+name);
                var options = object.options || {};
                models[modelName] = sequelize.define(modelName, object.model, options);
                if("relations" in object){
                    relationships[modelName] = {
                        relations : object.relations
                    }
                }
            }
        });
        for(var model in relationships){
            var relations = relationships[model].relations;
            for(var i=relations.length;i--;){
                winston.log("%s %s %s %s", model, relations[i].type, relations[i].model, relations[i].constraints ? 'with constraints: '+JSON.stringify(relations[i].constraints) : '');
                models[model][relations[i].type](models[relations[i].model], relations[i].constraints || null);
            }
        }
        if(ENV_CONFIG.Database.options.sync){
            sequelize[ENV_CONFIG.Database.options.force === true ? 'drop' : 'sync']().then(function(){
                if(ENV_CONFIG.Database.options.force === true){
                    syncDB(function(){
                        onComplete();
                    });
                }else{
                    onComplete();
                }
            });
        }else{
            if(typeof me.callback === typeof Function){
                me.callback();
            }
        }
    }

    function syncDB(callback){
        sequelize.sync().success(function(){
            callback();
        }).error(function(e){
            throw new Error("Could not sync DB ", e);
        });
    }

    function onComplete(){
        winston.log("Sequelize schemas created successfully");
        if(ENV_CONFIG.Database.options.createAdmin){
            require('../lib/startup/Models').setupAdmin(function(){
                if(typeof me.callback === typeof Function){
                    me.callback();
                }
            });
        }else{
            if(typeof me.callback === typeof Function){
                me.callback();
            }
        }
    }

    if(singleton.caller != singleton.getInstance){
        throw new Error("This object cannot be instanciated");
    }
};

singleton.instance = null;

singleton.getInstance = function(){
    if(this.instance === null){
        this.instance = new singleton();
    }
    return this.instance;
}

module.exports = singleton.getInstance();