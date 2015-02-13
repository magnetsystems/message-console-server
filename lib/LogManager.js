var fs = require('fs')
, WinstonSequelize = require('./winston-sequelize').WinstonSequelize;

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

LogManager.prototype.setFileLogHandler = function(silent){
    try{
        winston.remove(winston.transports.File);
    }catch(e){}
    if(ENV_CONFIG.FileLog.enabled){
        if(!fs.existsSync(ENV_CONFIG.FileLog.folder)){
            fs.mkdirSync(ENV_CONFIG.FileLog.folder);
        }
        winston.add(winston.transports.File, {
            filename         : ENV_CONFIG.FileLog.folder+'/'+ENV_CONFIG.FileLog.filename,
            maxsize          : ENV_CONFIG.FileLog.maxsize,
            maxFiles         : ENV_CONFIG.FileLog.maxFiles,
            handleExceptions : ENV_CONFIG.App.handleExceptions,
            level            : ENV_CONFIG.FileLog.level
        });
        winston.info('Logging: enabled file logging at level: '+ENV_CONFIG.FileLog.level);
    }else if(!silent){
        winston.info('Logging: disabled file logging.');
    }
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
            name : 'winston-mail'
        });
    }catch(e){}
    if(ENV_CONFIG.EmailAlerts.enabled){
        winston.add(require('winston-mail').Mail, {
            to               : ENV_CONFIG.EmailAlerts.recipient,
            from             : ENV_CONFIG.EmailAlerts.sender,
            host             : ENV_CONFIG.EmailAlerts.host,
            port             : ENV_CONFIG.EmailAlerts.port,
            username         : ENV_CONFIG.EmailAlerts.user,
            password         : ENV_CONFIG.EmailAlerts.password,
            tls              : true,
            level            : ENV_CONFIG.EmailAlerts.level,
            handleExceptions : ENV_CONFIG.App.handleExceptions
        });
        winston.info('Logging: enabled email logging at level: '+ENV_CONFIG.EmailAlerts.level);
    }else if(!silent){
        winston.info('Logging: disabled email logging.');
    }
};

module.exports = new LogManager();