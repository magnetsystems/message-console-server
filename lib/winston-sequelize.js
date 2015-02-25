var winston = require('winston')
, util = require('util')
, magnetId = require('node-uuid')
, orm = require('./orm');

var WinstonSequelize = exports.WinstonSequelize = function(options){
    options = options || {};
    this.name = 'winston-sequelize';
    this.level = options.level || 'info';
    this.silent = options.silent || false;
    this.handleExceptions = options.handleExceptions || false;
};

util.inherits(WinstonSequelize, winston.Transport);

WinstonSequelize.prototype.log = function(level, msg, meta, callback){
    var me = this;
    meta = meta || {};
    if(me.silent || !level) return callback(null, true);
    if(!orm.model('Event')) return;
    orm.model('Event').create({
        magnetId    : magnetId.v1(),
        level       : level,
        message     : msg,
        UserId      : meta ? meta.userId : '',
        targetModel : meta ? meta.targetModel : '',
        targetId    : meta ? meta.targetId : ''
    }).then(function(){
        callback(null, true);
    }).catch(function(e){
        if(e){
            me.emit('error', e);
        }else{
            me.emit('logged');
        }
        callback(null, true);
    });
};

winston.transports.WinstonSequelize = WinstonSequelize;

