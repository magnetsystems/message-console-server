var filesystem = require('fs');
var models = {};
var relationships = {};

var singleton = function singleton(){
    var Sequelize = require('sequelize');
    var sequelize = null;
    var modelsPath = '';
    this.setup = function (path, doSync, database, username, password, obj){
        modelsPath = path;
        sequelize = new Sequelize(database, username, password, obj);
        init(doSync);
    }

    this.model = function (name){
        return models[name];
    }

    this.Seq = function (){
        return Sequelize;
    }

    function init(doSync) {
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
                console.log("%s %s %s %s", model, relations[i].type, relations[i].model, relations[i].constraints ? 'with constraints: '+JSON.stringify(relations[i].constraints) : '');
                models[model][relations[i].type](models[relations[i].model], relations[i].constraints || null);
            }
        }
        if(doSync){
            sequelize.sync().success(function(){
                console.log("Sequelize schemas created successfully");
                // TODO: configure to only set up admin user in development mode
                var setupAdmin = require("../lib/startup/SetupAdmin");
            }).error(function(error){
                throw new Error("Could not create Schema ", error);
            });
        }
    }

    if(singleton.caller != singleton.getInstance){
        throw new Error("This object cannot be instanciated");
    }
}

singleton.instance = null;

singleton.getInstance = function(){
    if(this.instance === null){
        this.instance = new singleton();
    }
    return this.instance;
}

module.exports = singleton.getInstance();