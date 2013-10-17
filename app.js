var express = require('express')
, http = require('http')
, app = express()
, connect = require('express/node_modules/connect')
, fs = require('fs')
, winston = require('winston');

global.winston = winston;
global.ENV_CONFIG = require('./lib/config/config_'+app.settings.env);

require('./lib/orm').setup('./lib/models');

app.set('port', ENV_CONFIG.App.port);

app.configure(function(){
    // view rendering
    app.engine('ejs', require('ejs-locals'));
    app.set('views', __dirname + '/views');
    app.locals({
        _layoutFile : '/layouts/site'
    });
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
});

app.configure('development', function(){
    app.use(express.errorHandler({
        dumpExceptions : true,
        showStack      : true
    }));
    app.use(express.session({
        store  : new connect.middleware.session.MemoryStore(),
        secret : ENV_CONFIG.App.sessionSecret
    }));
    // prioritize router before public directory
    app.use(express.static(__dirname + '/public'));
});

app.configure('test', function(){
    app.use(express.errorHandler({
        dumpExceptions : true,
        showStack      : true
    }));
    app.use(express.session({
        store  : new connect.middleware.session.MemoryStore(),
        secret : ENV_CONFIG.App.sessionSecret
    }));
    // prioritize router before public directory
    app.use(express.static(__dirname + '/public'));
});

app.configure('production', function(){
    app.use(express.errorHandler());
    /// TODO: Take out before hitting production
    /* Authentication module to prevent authorized access to factory
    var auth = require('http-auth');
    var basic = auth.basic({
        realm : "Authenticated Area.",
        file  : "./data/users.htpasswd" // manager1@magnetapi.com/test
    });
    app.use(auth.connect(basic));
    */
    // stop exit after an uncaughtException
    winston.exitOnError = false;
    // log only errors to console
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, {
        level            : 'error',
        handleExceptions : true
    });
    // log only errors to support email
    winston.add(require('winston-mail').Mail, {
        to               : ENV_CONFIG.Email.supportEmail,
        from             : ENV_CONFIG.Email.sender,
        host             : ENV_CONFIG.Email.host,
        port             : ENV_CONFIG.Email.port,
        username         : ENV_CONFIG.Email.user,
        password         : ENV_CONFIG.Email.password,
        level            : 'error',
        tls              : true,
        handleExceptions : true
    });
    // log everything to file
    if(!fs.existsSync(ENV_CONFIG.Logging.folder)){
        fs.mkdirSync(ENV_CONFIG.Logging.folder);
        winston.log('Logging: created logging directory.');
    }
    winston.add(winston.transports.File, {
        filename         : ENV_CONFIG.Logging.folder+'/'+ENV_CONFIG.Logging.filename,
        maxsize          : ENV_CONFIG.Logging.maxsize,
        maxFiles         : ENV_CONFIG.Logging.maxFiles,
        handleExceptions : true
    });
    // store sessions to redis
    var RedisStore = require('connect-redis')(express);
    var redisDB = require('redis').createClient(ENV_CONFIG.Redis);
    app.use(express.session({
        secret : ENV_CONFIG.App.sessionSecret,
        store  : new RedisStore({
            client : redisDB,
            secret : ENV_CONFIG.App.sessionSecret
        })
    }));
    // minify client side code and set router to build path
    require('requirejs').optimize(require('./lib/config/ClientBuild'), function(){
        winston.info('Requirejs: successfully optimized client javascript');
    });
    // prioritize router before public directory, use minified public directory
    app.use(express.static(__dirname + '/public-build'));
});

// Routes
require('./routes')(app);

// Run Webserver

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    winston.info("Express: server listening on port %d in %s mode", app.get('port'), app.settings.env);
});