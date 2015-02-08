var express = require('express')
, http = require('http')
, app = express()
, connect = require('express/node_modules/connect')
, fs = require('fs')
, winston = require('winston')
, expressLayouts = require('express-ejs-layouts');

if(!app.settings.env || app.settings.env == ''){
    throw new Error('The environment variable NODE_ENV is not configured.');
}

global.winston = winston;
global.ENV_CONFIG = require('./lib/ConfigManager').get();

// database initialization
require('./lib/orm').setup('./lib/models', function(e){
    winston.info('Open web browser and navigate to '+ENV_CONFIG.App.appUrl+'/wizard to perform initial setup.');
});

// set port
app.set('port', ENV_CONFIG.App.port);

app.configure(function(){
    // view rendering
    app.engine('ejs', require('ejs-locals'));
    app.set('views', __dirname + '/views');
    app.set('layout', __dirname + '/views/layouts/general');
    app.use(expressLayouts);
    app.locals.open = '{{';
    app.locals.close = '}}';
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.cookieParser(ENV_CONFIG.App.sessionSecret));
    // enable PUT and DELETE request methods
    app.use(express.methodOverride());
    // enable event logging to database. NOTE: only designed to log events which contain metadata
    winston.add(require('./lib/winston-sequelize').WinstonSequelize, {
        level            : 'info',
        handleExceptions : false
    });
    app.disable('x-powered-by');
});

if(ENV_CONFIG.ConsoleLog.enabled){
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, {
        level            : ENV_CONFIG.ConsoleLog.level,
        handleExceptions : ENV_CONFIG.ConsoleLog.handleExceptions
    });
    winston.info('Logging: enabled console logging at level: '+ENV_CONFIG.ConsoleLog.level);
}
if(ENV_CONFIG.FileLog.enabled){
    if(!fs.existsSync(ENV_CONFIG.FileLog.folder)){
        fs.mkdirSync(ENV_CONFIG.FileLog.folder);
    }
    winston.add(winston.transports.File, {
        filename         : ENV_CONFIG.FileLog.folder+'/'+ENV_CONFIG.FileLog.filename,
        maxsize          : ENV_CONFIG.FileLog.maxsize,
        maxFiles         : ENV_CONFIG.FileLog.maxFiles,
        handleExceptions : ENV_CONFIG.FileLog.handleExceptions,
        level            : ENV_CONFIG.FileLog.level
    });
    winston.info('Logging: enabled file logging at level: '+ENV_CONFIG.FileLog.level);
}
if(ENV_CONFIG.EmailLog.enabled){
    winston.add(require('winston-mail').Mail, {
        to               : ENV_CONFIG.EmailLog.recipient,
        from             : ENV_CONFIG.EmailLog.sender,
        host             : ENV_CONFIG.EmailLog.host,
        port             : ENV_CONFIG.EmailLog.port,
        username         : ENV_CONFIG.EmailLog.user,
        password         : ENV_CONFIG.EmailLog.password,
        tls              : true,
        level            : ENV_CONFIG.EmailLog.level,
        handleExceptions : ENV_CONFIG.EmailLog.handleExceptions

    });
    winston.info('Logging: enabled email logging at level: '+ENV_CONFIG.EmailLog.level);
}

app.configure('development', function(){
    app.use(express.errorHandler({
        dumpExceptions : true,
        showStack      : true
    }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
    // stop exit after an uncaughtException
    winston.exitOnError = false;
});

if(ENV_CONFIG.Redis.enabled){
    // use redis session store
    var RedisStore = require('connect-redis')(express);
    var redisDB = require('redis').createClient(ENV_CONFIG.Redis.port, ENV_CONFIG.Redis.host);
    app.use(express.session({
        secret : ENV_CONFIG.App.sessionSecret,
        store  : new RedisStore({
            client : redisDB,
            secret : ENV_CONFIG.App.sessionSecret
        })
    }));
}else{
    // use memory session store
    app.use(express.session({
        store  : new connect.middleware.session.MemoryStore(),
        secret : ENV_CONFIG.App.sessionSecret
    }));
}

// prioritize router before public directory
app.use(express.static(__dirname + '/public'));

// routes
require('./routes')(app);

// run webserver
var server = http.createServer(app);
server.listen(app.get('port'), function(){
    winston.info("System: http server listening on port %d in %s mode", app.get('port'), app.settings.env);
});