var AWS = require('aws-sdk')
, fs = require('fs')
, crypto = require('crypto')
, childProcess = require('child_process');

var License = function(){};

var pk;

License.prototype.getPrivateKey = function(callback) {
    if (!pk) {
        var command = 'openssl dsa -in ' + ENV_CONFIG.License.PrivateKey + ' -passin pass:' + ENV_CONFIG.License.PrivateKeyPassword;
//        console.log('Command is ' + command);
        childProcess.exec(command, {},
            function (err, stdout, stderr) {
                if (err) {
                    callback(err, null);
                } else {
//                    console.log("Read PK");
                    pk = stdout; // Save in memory for later use
                    callback(err, stdout);
                }
            });
    } else {
        callback(null, pk);
    }
};

License.prototype.sign = function(data, callback) {
    this.getPrivateKey(function (err, pem) {
        if (!err) {
            var privateKey = pem.toString('ascii');
            var sign = crypto.createSign(ENV_CONFIG.License.Algorithm);
            sign.update(data);
            var signature = sign.sign(privateKey, ENV_CONFIG.License.SignatureFormat);
            callback(signature);
        } else {
            callback(null);
        }
    });

};

License.prototype.verify = function(data, signature, callback) {
    this.getPrivateKey(function (err, pem) {
        if (!err) {
            var privateKey = pem.toString('ascii');
            var verifier = crypto.createVerify(ENV_CONFIG.License.Algorithm);
            verifier.update(data);
            var isVerified = verifier.verify(privateKey, signature, ENV_CONFIG.License.SignatureFormat);
            callback(isVerified);
        } else {
            callback(null);
        }
    });
};

module.exports = new License();
