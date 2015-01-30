var forever = require('forever-monitor')
, winston = require('winston');

var child = new (forever.Monitor)('app.js', {
    env : {
        NODE_ENV : 'development'
    }
});

child.on('exit', function(){
    winston.info('System: http server exiting permanently.');
});

child.on('restart', function(){
    winston.info('System: http server restarting.');
});

child.start();