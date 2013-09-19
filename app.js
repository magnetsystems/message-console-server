/* Module dependencies */

var express = require('express')
, app = express.createServer()
, http = require('http')
, connect = require('express/node_modules/connect')
, io = require('socket.io').listen(app)
, store
, fs = require('fs')
, Sequelize = require('sequelize')
, db = new Sequelize('developercenter', 'root')
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
GLOBAL.Sequelize = Sequelize;
GLOBAL.db = db;

// Setup Schema

var Schemas = require('./lib/Schemas');

// Routes

require('./routes')(app);



function main() {
    fs.readdir("./node_modules", function (err, dirs) {
        if (err) {
            console.log(err);
            return;
        }
        dirs.forEach(function(dir){
            if (dir.indexOf(".") !== 0) {
                var packageJsonFile = "./node_modules/" + dir + "/package.json";
                if (fs.existsSync(packageJsonFile)) {
                    fs.readFile(packageJsonFile, function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            var json = JSON.parse(data);
                            console.log('"'+json.name+'": "' + json.version + '",');
                        }
                    });
                }
            }
        });

    });
}
main();

// Listener

app.listen(3000);
console.log("Express: server listening on port %d in %s mode", app.address().port, app.settings.env);
