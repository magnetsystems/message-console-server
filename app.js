/* Module dependencies */

var express = require('express')
, app = express.createServer()
, http = require('http')
, connect = require('express/node_modules/connect')
, io = require('socket.io').listen(app)
, fs = require('fs');

require('./lib/orm').setup('./lib/models', true, 'developercenter', 'root');

var secret = 'ThisSecretShouldBeChanged';
var cookieParser = express.cookieParser(secret);
var sessionStore = new connect.middleware.session.MemoryStore();

app.on('uncaughtException', function(error){
    console.log('Uncaught Error: ');
    console.log(error.stack);
});

// Configuration

app.configure(function(){

    app.set('views', __dirname + '/views');
    //app.set('view engine', 'jade');
    //app.set('view engine', 'html');

    app.set('view engine', 'ejs');
    app.set("view options", {
        layout : true,
        open   : '{{',
        close  : '}}'
    });

    // app.set('view options', { doctype : 'html', pretty : true });
    
    /* make a custom html template
    app.register('.html', {
        compile: function(str, options){
            return function(locals){
                return str;
        }}
    });
    */

    app.use(express.bodyParser());
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
GLOBAL.io = io;
GLOBAL.tmplVars = {
    resourceUrl : 'localhost:3000/resources'
};

// Routes

require('./routes')(app);

// Listener

app.listen(3000, 'localhost', function() {
    console.info("Express: server listening on port %d in %s mode", app.address().port, app.settings.env);
});
