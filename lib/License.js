var AWS = require('aws-sdk')
, fs = require('fs')
, crypto = require('crypto');

var License = function(){};

License.prototype.sign = function(data, callback) {
    fs.readFile(ENV_CONFIG.License.PrivateKey, function (err, pem) {
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
    fs.readFile(ENV_CONFIG.License.PrivateKey, function (err, pem) {
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
