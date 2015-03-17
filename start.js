var forever = require('forever-monitor')
, winston = require('winston');

var child = new (forever.Monitor)('app.js', {
    env : {
        NODE_ENV : 'development'
    },
    minUptime     : 1000,
    spinSleepTime : 1000,
    killTree      : true
});

child.on('exit', function(){
    winston.info('System: http server exiting permanently.');
});

child.on('restart', function(){
    winston.info('System: http server restarting.');
});

process.on('SIGTERM',function(){
    winston.info('System: http server stopping.');
    child.stop();
    child.on('stop', function(){
        process.exit(0);
    });
});

child.start();