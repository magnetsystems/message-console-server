/* Module dependencies */

var express = require('express')
, app = express.createServer()
, http = require('http')
, connect = require('express/node_modules/connect')
, io = require('socket.io').listen(app)
, store
, fs = require('fs')
, mongoose = require('mongoose')
, db = mongoose.createConnection('mongodb://localhost:27017/MagnetDeveloperFactory')
, SessionSockets = require('session.socket.io');


var secret = 'ThisSecretShouldBeChanged';
var cookieParser = express.cookieParser(secret);
var sessionStore = new connect.middleware.session.MemoryStore();
var sessionSockets = new SessionSockets(io, sessionStore, cookieParser);

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
GLOBAL.sessionSockets = sessionSockets;
GLOBAL.db = db;
GLOBAL.mongoose = mongoose;

// connect to MongoDB database

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
    console.log('MongoDB: connected successfully on port: ' + 27017);
    var Core = require('./lib/Core');
});

// Routes 

require('./routes')(app);

// Listener

app.listen(3000);
console.log("Express: server listening on port %d in %s mode", app.address().port, app.settings.env);
