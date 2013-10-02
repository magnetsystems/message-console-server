var express = require('express')
, http = require('http')
, app = express()
, server = http.createServer(app)
, connect = require('express/node_modules/connect')
, fs = require('fs')
, ENV_CONFIG = require('./lib/config/env_config');

require('./lib/orm').setup('./lib/models',
    ENV_CONFIG.Database.doSync,
    ENV_CONFIG.Database.dbName,
    ENV_CONFIG.Database.username,
    ENV_CONFIG.Database.password,
    ENV_CONFIG.Database.params
);

app.on('uncaughtException', function(error){
    console.error('Uncaught Error: ');
    console.error(error.stack);
});

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

    // prioritize router before public directory
    app.use(express.static(__dirname + '/public'));

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
    var RedisStore = require('connect-redis')(express);
    //app.use(auth.connect(basic));
    connect().use(connect.session({
        store  :  new RedisStore(),
        secret : ENV_CONFIG.App.sessionSecret
    }));
});

// Routes
require('./routes')(app);

// Listener
server.listen(app.get('port'), function(){
    console.info("Express: server listening on port %d in %s mode", app.get('port'), app.settings.env);
});