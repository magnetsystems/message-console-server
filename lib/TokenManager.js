var orm = require('./orm')
, magnetId = require('node-uuid')
, License = require('./License');

var TokenManager = function(){};

// create Magnet token for authentication and metering
TokenManager.prototype.create = function(user, callback){
    var cloudAccountMagnetId = magnetId.v1();
    var randomKey = magnetId.v4();
    var provider = 'Magnet';
    License.sign(randomKey, function(secretKey){
        var body = {
            magnetId        : cloudAccountMagnetId,
            ownerType       : 'User',
            name            : user.email + "'s " + provider + " authentication tokens",
            provider        : provider,
            bucketName      : cloudAccountMagnetId,
            accessKeyId     : toAccessKey(randomKey),
            secretAccessKey : secretKey
        };
        orm.model('CloudAccount').create(body).success(function(cloudAccount){
            user.addCloudAccount(cloudAccount).success(function(){
                winston.verbose("TokenManager: successfully provisioned Magnet token for: "+user.email);
                callback();
            }).error(function(error){
                winston.error("TokenManager: error creating Magnet token for " + user.email +" with error: ", error);
                callback(error || 'token-persist-error');
            });
        }).error(function(e){
            winston.error('TokenManager: creation of cloudAccount "' + body.provider + '" failed: ',e);
            callback('invalid-body');
        });
    });
};

// revoke Magnet token
TokenManager.prototype.revoke = function(sessionUser, uuid, callback){
    var me = this;
    me.read(sessionUser, uuid, function(e, cloudAccount){
        var body = {
            enabled : false
        };
        if(cloudAccount){
            cloudAccount.updateAttributes(body).success(function(edited){
                callback(null, edited);
            }).error(function(e){
                winston.error('TokenManager: cloud account "' + cloudAccount.name + '" update failed: ',e);
                callback('error-updating-token');
            });
        }else{
            callback(e);
        }
    });
};

// allocate new Magnet token
TokenManager.prototype.allocate = function(sessionUser, uuid, callback){
    var me = this;
    me.read(sessionUser, uuid, function(e, cloudAccount){
        var randomKey = magnetId.v4();
        License.sign(randomKey, function(secretKey){
            var body = {
                accessKeyId     : toAccessKey(randomKey),
                secretAccessKey : secretKey,
                enabled         : true
            };
            if(cloudAccount){
                cloudAccount.updateAttributes(body).success(function(edited){
                    callback(null, body);
                }).error(function(e){
                    winston.error('TokenManager: cloud account "' + cloudAccount.name + '" update failed: ',e);
                    callback('error-updating-token');
                });
            }else{
                callback(e);
            }
        });
    });
};

// given accessKey, return cloud account
TokenManager.prototype.read = function(sessionUser, uuid, callback){
    var where = {
        magnetId : uuid
    };
    if(sessionUser.userType != 'admin') where.UserId = sessionUser.id;
    orm.model('CloudAccount').find({
        where : where
    }).success(function(cloudAccount){
        if(cloudAccount){
            callback(null, cloudAccount);
        }else{
            winston.error('TokenManager: no cloud account was found with the given access key');
            callback('token-not-found');
        }
    }).error(function(e){
        winston.error('TokenManager: error attempting to find cloud account', e);
        callback('token-find-error');
    });
};

// get list of keypairs belonging to the current user
TokenManager.prototype.getTokens = function(sessionUser, callback){
    var me = this;
    orm.model('CloudAccount').findAll({
        where : {
            UserId : sessionUser.id
        },
        attributes : ['name', 'accessKeyId', 'secretAccessKey', 'ownerType', 'provider', 'magnetId', 'updatedAt', 'enabled', 'id']
    }).success(function(cloudAccounts){
        me.getOrCreateToken(sessionUser, cloudAccounts, callback);
    }).error(function(e){
        winston.error('TokenManager: error attempting to find cloud account', e);
        callback('token-find-error');
    });
};

TokenManager.prototype.getOrCreateToken = function(sessionUser, cloudAccounts, callback){
    var me = this;
    var hasMagnetToken = false;
    for(var i=0;i<cloudAccounts.length;++i){
        if(cloudAccounts[i].dataValues.provider === 'Magnet'){
            hasMagnetToken = true;
        }
    }
    if(hasMagnetToken === false){
        orm.model('User').find({
            where : {
                magnetId : sessionUser.magnetId
            }
        }).success(function(user){
            if(user){
                me.create(user, function(e){
                    if(e){
                        callback(e);
                    }else{
                        me.getTokens(sessionUser, callback);
                    }
                });
            }else{
                callback('user-not-exist');
            }
        }).error(function(){
            callback('user-fetch-failed');
        });
    }else{
        callback(null, cloudAccounts);
    }
};

module.exports = new TokenManager();

function toAccessKey(str){
    return str.replace(/-/g, '').toUpperCase();
}
