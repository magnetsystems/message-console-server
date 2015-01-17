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
global.ENV_CONFIG = require('./lib/config/config_'+app.settings.env);
global.APP_CONFIG = {};

require('./lib/orm').setup('./lib/models');

app.set('port', ENV_CONFIG.App.port);

app.configure(function(){
    // view rendering
    app.engine('ejs', require('ejs-locals'));
    app.set('views', __dirname + '/views');
    app.set('layout', __dirname + '/views/layouts/site_dev');
    app.use(expressLayouts);
//    app.locals({
//        _layoutFile : '/layouts/site'
//    });

    app.locals.open = '{{';
    app.locals.close = '}}';
    app.set('view engine', 'ejs');
    // allow req.body
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

if(ENV_CONFIG.Logging.console.enabled){
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, {
        level            : ENV_CONFIG.Logging.console.level,
        handleExceptions : ENV_CONFIG.Logging.console.handleExceptions
    });
    winston.info('Logging: enabled console logging at level: '+ENV_CONFIG.Logging.console.level);
}
if(ENV_CONFIG.Logging.file.enabled){
    if(!fs.existsSync(ENV_CONFIG.Logging.file.folder)){
        fs.mkdirSync(ENV_CONFIG.Logging.file.folder);
    }
    winston.add(winston.transports.File, {
        filename         : ENV_CONFIG.Logging.file.folder+'/'+ENV_CONFIG.Logging.file.filename,
        maxsize          : ENV_CONFIG.Logging.file.maxsize,
        maxFiles         : ENV_CONFIG.Logging.file.maxFiles,
        handleExceptions : ENV_CONFIG.Logging.file.handleExceptions,
        level            : ENV_CONFIG.Logging.file.level
    });
    winston.info('Logging: enabled file logging at level: '+ENV_CONFIG.Logging.file.level);
}
if(ENV_CONFIG.Logging.email.enabled){
    winston.add(require('winston-mail').Mail, {
        to               : ENV_CONFIG.Logging.email.recipient,
        from             : ENV_CONFIG.Logging.email.sender,
        host             : ENV_CONFIG.Logging.email.host,
        port             : ENV_CONFIG.Logging.email.port,
        username         : ENV_CONFIG.Logging.email.user,
        password         : ENV_CONFIG.Logging.email.password,
        tls              : true,
        level            : ENV_CONFIG.Logging.email.level,
        handleExceptions : ENV_CONFIG.Logging.email.handleExceptions

    });
    winston.info('Logging: enabled email logging at level: '+ENV_CONFIG.Logging.email.level);
}

if(app.settings.env == 'development' || app.settings.env == 'test'){
    app.use(express.errorHandler({
        dumpExceptions : true,
        showStack      : true
    }));
    app.use(express.session({
        store  : new connect.middleware.session.MemoryStore(),
        secret : ENV_CONFIG.App.sessionSecret
    }));
    // protect files and documentation behind login
//    app.use(require('./lib/UserManager').checkAuthority(['admin', 'developer'], false, /^\/resources\/files\/.*$/));
    app.use(require('./lib/UserManager').checkAuthority(['admin', 'developer'], false, /^\/docs\/.*\/.*$/));
    // prioritize router before public directory
    app.use(express.static(__dirname + '/public'));
}

app.configure('production', function(){
    app.use(express.errorHandler());
    // stop exit after an uncaughtException
    winston.exitOnError = false;
    // store sessions to redis
    var RedisStore = require('connect-redis')(express);
    var redisDB = require('redis').createClient(ENV_CONFIG.Redis.port, ENV_CONFIG.Redis.host);
    app.use(express.session({
        secret : ENV_CONFIG.App.sessionSecret,
        store  : new RedisStore({
            client : redisDB,
            secret : ENV_CONFIG.App.sessionSecret
        })
    }));
    // minify client side code and set router to build path
//    require('requirejs').optimize(require('./lib/config/ClientBuild'), function(){
//        winston.info('Requirejs: successfully optimized client javascript');
//    });
    // protect files and documentation behind login
//    app.use(require('./lib/UserManager').checkAuthority(['admin', 'developer'], false, /^\/resources\/files\/.*$/));
    if(ENV_CONFIG.App.docNeedAuth) app.use(require('./lib/UserManager').checkAuthority(['admin', 'developer'], false, /^\/docs\/.*\/.*$/));
    // prioritize router before public directory, use minified public directory
    app.use(express.static(__dirname + '/public'));
    /* start https server
    require('https').createServer({
       key  : fs.readFileSync('./data/key.pem'),
       cert : fs.readFileSync('./data/cert.pem')
    }, app).listen(3001, function(){
       winston.info('Express: https server listening on port %d in %s mode', 3001, app.settings.env);
    });
    */
});

// Routes
require('./routes')(app);

// Run Webserver
var server = http.createServer(app);
server.listen(app.get('port'), function(){
    winston.info("Express: http server listening on port %d in %s mode", app.get('port'), app.settings.env);
});