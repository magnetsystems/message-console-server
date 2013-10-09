var express = require('express')
, http = require('http')
, app = express()
, server = http.createServer(app)
, connect = require('express/node_modules/connect')
, fs = require('fs')
, winston = require('winston');

global.winston = winston;
global.ENV_CONFIG = require('./lib/config/config_'+app.settings.env);

require('./lib/orm').setup('./lib/models');

app.set('port', ENV_CONFIG.App.port);

app.configure(function(){

    /* view rendering */
    app.engine('ejs', require('ejs-locals'));

    app.set('views', __dirname + '/views');
    app.locals({
        _layoutFile : '/layouts/site'
    });
    app.locals.open = '{{';
    app.locals.close = '}}';
    app.set('view engine', 'ejs');

    /* app configuration */
    app.use(express.bodyParser());
    app.use(express.cookieParser(ENV_CONFIG.App.sessionSecret));
    app.use(express.methodOverride());

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
    // Authentication module.
    var auth = require('http-auth');
    var basic = auth.basic({
        realm : "Authenticated Area.",
        file  : "./data/users.htpasswd" // manager1@magnetapi.com/test
    });
    //app.use(auth.connect(basic));
    // log errors to console, log everything to file
    global.winston = new (winston.Logger)({
        transports : [
            new (winston.transports.Console)({
                level : 'error'
            }),
            new (winston.transports.File)({
                filename : 'target/events/server.log'
            })
        ]
    });
    var RedisStore = require('connect-redis')(express);
    connect().use(connect.session({
        store  :  new RedisStore(),
        secret : ENV_CONFIG.App.sessionSecret
    }));
    // minify client side code and set router to build path
    require('requirejs').optimize(require('./lib/config/ClientBuild'), function(){
        winston.info('Requirejs: successfully optimized client javascript');
    });
    // prioritize router before public directory
    app.use(express.static(__dirname + '/public-build'));
});

// Routes
require('./routes')(app);

// Listener
server.listen(app.get('port'), function(){
    winston.info("Express: server listening on port %d in %s mode", app.get('port'), app.settings.env);
});