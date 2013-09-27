var filesystem = require('fs');
var models = {};
var relationships = {};

var singleton = function singleton(){
    var Sequelize = require("sequelize");
    var sequelize = null;
    var modelsPath = "";
    this.setup = function (path, doSync, database, username, password, obj){
        modelsPath = path;
        if(arguments.length == 3){
            sequelize = new Sequelize(database, username);
        }else if(arguments.length == 4){
            sequelize = new Sequelize(database, username, password);
        }else if(arguments.length == 5){
            sequelize = new Sequelize(database, username, password, obj);
        }
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
                        relations: object.relations,
                        constraints: object.constraints
                    }
                }
            }
        });
//        console.info(models);
        for(var name in relationships){
            var relation = relationships[name].relations;
            var constraint = relationships[name].constraints;
            for(var relName in relation){
                var related = relation[relName];
                console.log("%s is related to %s by %s", name, related, relName);
                if(typeof constraint !== "undefined") {
                    console.log("constraint is " + JSON.stringify(constraint));
                    models[name][relName](models[related], constraint);
                } else {
                    models[name][relName](models[related]);
                }
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