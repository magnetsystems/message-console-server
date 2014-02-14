var Enum = require('enum')
, mysql = require('mysql')
, crypto = require('crypto');

var JumpStartUserManager = function(isEnabled, pool) {
    this.isEnabled = isEnabled;
    this.pool = pool;
};

var isEnabled = false;
var pool;

if(ENV_CONFIG.JumpStart.syncJumpstartDB) {
    isEnabled = true;

    pool  = mysql.createPool({
        host     : ENV_CONFIG.JumpStart.Database.params.host,
        user     : ENV_CONFIG.JumpStart.Database.username,
        password : ENV_CONFIG.JumpStart.Database.password,
        database : ENV_CONFIG.JumpStart.Database.dbName,
        port     : ENV_CONFIG.JumpStart.Database.params.port
    });
    winston.info("JumpStart DB: enabled");
} else {
    winston.info("JumpStart DB: disabled");
}

function getHash(str){
    var shasum = crypto.createHash('sha1');
    shasum.update(ENV_CONFIG.JumpStart.Database.salt);
    shasum.update(str);
    var out = 'SHA-1'+shasum.digest('base64');
    return (out.charAt(out.length-1) == '=' ? out.slice(0, -1) : out);
}

var procedureVars = '","' + ENV_CONFIG.JumpStart.Database.type + '","' + ENV_CONFIG.JumpStart.Database.salt + '"';

var UserStatusEnum = new Enum({
    USER_ALREADY_EXISTS: 99001,
    USER_DOES_NOT_EXIST: 99002
});

JumpStartUserManager.prototype.createUser = function(userName, password, callback){
    var me = this;
    if (this.isEnabled) {
        this.pool.getConnection(function(err, connection) {
            if (!err) {
                // Use the connection
                connection.query("CALL user_create(" + connection.escape(userName) + ",\"" + getHash(password) + procedureVars + ")", function(err, rows) {
                    if (err) {
                        winston.error('JumpStart DB: user creation of "' + userName + '" failed: ', err);
                        if (err.sqlState == UserStatusEnum.USER_ALREADY_EXISTS.value) {
                            winston.info('JumpStart DB: Trying to update %s since the user already exists', userName);
                            me.updateUser(userName, password, callback);
                        } else {
                            callback(err);
                        }
                    } else {
                        winston.verbose('JumpStart DB: user creation of "' + userName + '" succeeded!');
                        callback(null);
                    }
                    // And done with the connection.
                    connection.release();
                    // Don't use the connection here, it has been returned to the pool.
                });
            } else {
                callback(err);
                winston.error("JumpStart DB: Could not establish a connection: ", err);
            }
        });
    }
};

JumpStartUserManager.prototype.updateUser = function(userName, password, callback){
    var me = this;
    if (this.isEnabled) {
        this.pool.getConnection(function(err, connection) {
            if (!err) {
                connection.query("CALL user_update(" + connection.escape(userName) + ",\"" + getHash(password) + procedureVars + ")", function(err, rows) {
                    if (err) {
                        winston.error('JumpStart DB: user update of "' + userName + '" failed: ', err);
                        if (err.sqlState == UserStatusEnum.USER_DOES_NOT_EXIST.value) {
                            winston.info('JumpStart DB: Trying to create %s since the user did not exist', userName);
                            me.createUser(userName, password, callback);
                        } else {
                            callback(err);
                        }
                    } else {
                        winston.verbose('JumpStart DB: user update of "' + userName + '" succeeded!');
                        callback(null);
                    }
                    connection.release();
                });
            } else {
                callback(err);
                winston.error("JumpStart DB: Could not establish a connection: ", err);
            }
        });
    }
};

JumpStartUserManager.prototype.deleteUser = function(userName, callback){
    if (this.isEnabled) {
        this.pool.getConnection(function(err, connection) {
            if (!err) {
                connection.query("CALL user_delete(" + connection.escape(userName) + ")", function(err, rows) {
                    if (err) {
                        winston.error('JumpStart DB: user deletion of "' + userName + '" failed: ', err);
                        callback(err);
                    } else {
                        winston.verbose('JumpStart DB: user deletion of "' + userName + '" succeeded!');
                        callback(null);
                    }
                    connection.release();
                });
            } else {
                callback(err);
                winston.error("JumpStart DB: Could not establish a connection: ", err);
            }
        });
    }
};

JumpStartUserManager.prototype.setActivation = function(userName, isActivated, callback){
    if (this.isEnabled) {
        this.pool.getConnection(function(err, connection) {
            if (!err) {
                connection.query("CALL user_activate(" + connection.escape(userName) + "," + connection.escape(isActivated) + ")", function(err, rows) {
                    if (err) {
                        winston.error('JumpStart DB: user "' + userName + '" activation state change to activated:'+isActivated+' failed: ', err);
                        callback(err);
                    } else {
                        winston.verbose('JumpStart DB: user "' + userName + '" activation state change to activated:'+isActivated+' succeeded!');
                        callback(null);
                    }
                    connection.release();
                });
            } else {
                callback(err);
                winston.error("JumpStart DB: Could not establish a connection: ", err);
            }
        });
    }
};

module.exports = new JumpStartUserManager(isEnabled, pool);
