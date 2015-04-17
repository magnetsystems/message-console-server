var fs = require('fs')
, WinstonSequelize = require('./winston-sequelize').WinstonSequelize
, WinstonMail = require('winston-mail').Mail;

var LogManager = function(){};

LogManager.prototype.refreshLogHandlers = function(){
    this.setHandler('ConsoleLog', true);
    this.setHandler('FileLog', true);
    this.setHandler('DatabaseLog', true);
    this.setHandler('EmailAlerts', true);
};

LogManager.prototype.setHandler = function(handler, silent){
    this['set'+handler+'Handler'](silent);
};

LogManager.prototype.setConsoleLogHandler = function(silent){
    try{
        winston.remove(winston.transports.Console);
    }catch(e){}
    if(ENV_CONFIG.ConsoleLog.enabled){
        winston.add(winston.transports.Console, {
            level            : ENV_CONFIG.ConsoleLog.level,
            handleExceptions : ENV_CONFIG.App.handleExceptions
        });
        winston.info('Logging: enabled console logging at level: '+ENV_CONFIG.ConsoleLog.level);
    }else if(!silent){
        winston.info('Logging: disabled console logging.');
    }
};

LogManager.prototype.setFileLogHandler = function(silent, paramConfigs, cb){
    var configs = paramConfigs || ENV_CONFIG.FileLog;
    if(configs.enabled){
        if(!fs.existsSync(configs.folder)){
            fs.mkdirSync(configs.folder);
        }
        var filename = configs.folder+'/'+configs.filename;
        checkFilePermissions(configs.folder, 2, function(e, isWritable){
            checkFilePermissions(filename, 2, function(e2, isWritable2){
                if(e && e.code && e.code != 'ENOENT'){
                    winston.error('Logging: unable to log to folder "'+configs.folder+'": ', e);
                    return (cb || function(){})('folder-permission-error');
                }
                if(!e && !isWritable){
                    winston.error('Logging: unable to log to folder "'+configs.folder+'": ', 'permission-error');
                    return (cb || function(){})('folder-permission-error');
                }
                if(e2 && e2.code != 'ENOENT'){
                    winston.error('Logging: unable to log to file "'+filename+'": ', e);
                    return (cb || function(){})('file-permission-error');
                }
                if(!e2 && !isWritable2){
                    winston.error('Logging: unable to log to file "'+filename+'": ', 'permission-error');
                    return (cb || function(){})('file-permission-error');
                }
                try{
                    winston.remove(winston.transports.File);
                }catch(e){}
                winston.add(winston.transports.File, {
                    filename         : filename,
                    maxsize          : configs.maxsize,
                    maxFiles         : configs.maxFiles,
                    handleExceptions : ENV_CONFIG.App.handleExceptions,
                    level            : configs.level
                });
                winston.info('Logging: enabled file logging at level: '+configs.level);
                (cb || function(){})();
            });
        });
    }else if(!silent){
        try{
            winston.remove(winston.transports.File);
        }catch(e){}
        winston.info('Logging: disabled file logging.');
        (cb || function(){})();

    }
};

var checkFilePermissions = function(file, mask, cb){
    fs.stat(file, function(e, stats){
        if(e){
            cb(e, false);
        }else{
            cb(null, !!(mask & parseInt((stats.mode & parseInt('777', 8)).toString(8)[0])));
        }
    });
};

LogManager.prototype.setDatabaseLogHandler = function(silent){
    try{
        winston.remove({
            name : 'winston-sequelize'
        });
    }catch(e){}
    if(ENV_CONFIG.DatabaseLog.enabled){
        // enable event logging to database. NOTE: only designed to log events which contain metadata
        winston.add(winston.transports.WinstonSequelize, {
            level            : ENV_CONFIG.DatabaseLog.level,
            handleExceptions : ENV_CONFIG.App.handleExceptions
        });
        winston.info('Logging: enabled database logging at level: '+ENV_CONFIG.DatabaseLog.level);
    }else if(!silent){
        winston.info('Logging: disabled database logging.');
    }
};

LogManager.prototype.setEmailAlertsHandler = function(silent){
    try{
        winston.remove({
            name : 'mail'
        });
    }catch(e){}
    if(ENV_CONFIG.EmailAlerts.enabled){
        winston.add(WinstonMail, {
            to               : ENV_CONFIG.EmailAlerts.recipient,
            from             : ENV_CONFIG.EmailAlerts.sender,
            host             : ENV_CONFIG.EmailAlerts.host,
            port             : ENV_CONFIG.EmailAlerts.port,
            username         : ENV_CONFIG.EmailAlerts.user,
            password         : ENV_CONFIG.EmailAlerts.password,
            tls              : ENV_CONFIG.EmailAlerts.tls,
            level            : ENV_CONFIG.EmailAlerts.level,
            handleExceptions : ENV_CONFIG.App.handleExceptions
        });
        winston.info('Logging: enabled email logging at level: '+ENV_CONFIG.EmailAlerts.level);
    }else if(!silent){
        winston.info('Logging: disabled email logging.');
    }
};

module.exports = new LogManager();