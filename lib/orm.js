var filesystem = require('fs');
var models = {};
var relationships = {};

var singleton = function singleton(){
    var Sequelize = require('sequelize');
    var sequelize = new Sequelize(
        ENV_CONFIG.Database.dbName,
        ENV_CONFIG.Database.username,
        ENV_CONFIG.Database.password,
        {
            host    : ENV_CONFIG.Database.host || 'localhost',
            port    : ENV_CONFIG.Database.port || 3306,
            logging : winston.verbose,
            define  : {
                charset : ENV_CONFIG.Database.charset || 'utf8'
            }
        }
    );
    var modelsPath = '';
    var me = this;

    this.setup = function(path, callback){
        var me = this;
        modelsPath = path;
        sequelize.authenticate().complete(function(e){
            if(e){
                if(ENV_CONFIG.App.configured){
                    winston.error('ORM: unable to connect to database: ', e);
                    throw(e);
                }else if(typeof callback === typeof Function){
                    callback('connect-error');
                }
                return;
            }
            winston.info('ORM: connected to database: '+ENV_CONFIG.Database.dbName);
            me.callback = function(){
                if(typeof callback === typeof Function){
                    callback();
                }
            };
            init();
        });
    };

    this.model = function(name){
        return models[name];
    };

    this.Seq = function(){
        return Sequelize;
    };

    this.seq = function(){
        return sequelize;
    };

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
                winston.verbose("ORM: %s %s %s %s", model, relations[i].type, relations[i].model, relations[i].constraints ? 'with constraints: '+JSON.stringify(relations[i].constraints) : '');
                models[model][relations[i].type](models[relations[i].model], relations[i].constraints || null);
            }
        }
        if(ENV_CONFIG.Database.sync){
            sequelize[ENV_CONFIG.Database.force === true ? 'drop' : 'sync']().then(function(){
                if(ENV_CONFIG.Database.force === true){
                    syncDB(function(){
                        onComplete();
                    });
                }else{
                    onComplete();
                }
            }, function(e){
                winston.error(e);
                throw(e);
            });
        }else{
            me.callback();
        }
    }

    function syncDB(callback){
        sequelize.sync().success(function(){
            callback();
        }).error(function(e){
            throw new Error('ORM: Could not sync DB: ', e);
        });
    }

    function onComplete(){
        winston.info('ORM: Sequelize schemas created successfully');
        me.callback();
    }

    if(singleton.caller != singleton.getInstance){
        throw new Error('This object cannot be instantiated');
    }
};

singleton.instance = null;

singleton.getInstance = function(){
    if(this.instance === null){
        this.instance = new singleton();
    }
    return this.instance;
};

module.exports = singleton.getInstance();