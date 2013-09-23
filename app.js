/* Module dependencies */

var express = require('express')
, http = require('http')
, app = express()
, engine = require('ejs-locals')
, server = http.createServer(app)
, connect = require('express/node_modules/connect')
, fs = require('fs');

require('./lib/orm').setup('./lib/models', true, 'developercenter', 'root');

var secret = 'ThisSecretShouldBeChanged';
var cookieParser = express.cookieParser(secret);
var sessionStore = new connect.middleware.session.MemoryStore();

app.on('uncaughtException', function(error){
    console.error('Uncaught Error: ');
    console.error(error.stack);
});

// Configuration

// use ejs-locals for all ejs templates:
app.engine('ejs', engine);

app.configure(function(){

    app.set('port', 3000);

    app.set('views', __dirname + '/views');

    app.locals({
        _layoutFile : '/layouts/site'
    });

    app.locals.open = '{{';
    app.locals.close = '}}';

    //app.set('template_engine', 'ejs');
    app.set('view engine', 'ejs');

    app.use(express.bodyParser());

    /*
    var bodyParser = express.bodyParser();
    app.use(function(req, res, next){
        console.error(req.headers['content-type']);
        if(req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data') != -1){
            console.log('is octet');
            return next();
        }
        bodyParser(req, res, next);
    });
    */

    app.use(cookieParser);
    app.use(express.session({
        store  : sessionStore,
        secret : secret // secure session
    }));

    app.use(express.methodOverride());

    // prioritize router before public directory
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({
        dumpExceptions : true,
        showStack      : true
    }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Global variables

GLOBAL.app = app;
GLOBAL.http = http;
GLOBAL.fs = fs;
GLOBAL.tmplVars = {
    resourceUrl : 'localhost:3000/resources'
};

// Routes

require('./routes')(app);

// Listener

/*
server.listen(3000, 'localhost', function(){
    console.info("Express: server listening on port %d in %s mode", server.address().port, app.settings.env);
});
*/

http.createServer(app).listen(app.get('port'), function(){
    console.info("Express: server listening on port %d in %s mode", app.get('port'), app.settings.env);
});