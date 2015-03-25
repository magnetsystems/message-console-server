var express = require('express')
, http = require('http')
, app = express()
, connect = require('express/node_modules/connect')
, winston = require('winston')
, expressLayouts = require('express-ejs-layouts');

if(!app.settings.env || app.settings.env == ''){
    throw new Error('The environment variable NODE_ENV is not configured.');
}

global.winston = winston;

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    level            : 'verbose',
    handleExceptions : false
});

var ConfigManager = require('./lib/ConfigManager');
global.ENV_CONFIG = ConfigManager.configs;
global.INST_CONFIG = {};

var startServer = function(){

    // database initialization
    require('./lib/orm').setup('./lib/models');

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
        app.enable('trust proxy');
        app.disable('x-powered-by');
    });

    require('./lib/LogManager').refreshLogHandlers();

    if(ENV_CONFIG.Geologging.enabled)
        require('./lib/Geologger').init();

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

};

ConfigManager.init(function(e){
    if(e) throw new Error('Config: unable to initialize configuration: ', e);
    startServer();
});