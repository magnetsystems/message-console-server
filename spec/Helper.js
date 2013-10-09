/**
 * Created with JetBrains WebStorm.
 * User: pshah
 * Date: 9/30/13
 * Time: 10:16 PM
 * To change this template use File | Settings | File Templates.
 */
ENV_CONFIG = require('../lib/config/config_'+process.env.NODE_ENV);
winston = require('winston');
var AWS = require('aws-sdk');

beforeAll = function(fn){
    it('[beforeAll]', fn);
};

afterAll = function(fn){
    it('[afterAll]', fn)
};

AWS.config.update(ENV_CONFIG.AWS);

var iam = new AWS.IAM({apiVersion: ENV_CONFIG.Cloud.AWS.IAMApiVersion});

var Helper = function(){};

Helper.prototype.removeUser = function(userName, done) {
    // Cleanup: Delete policy, keys and then User
    // We assume that our User would have a max of 1 access key
    iam.deleteUserPolicy({UserName: userName, PolicyName: ENV_CONFIG.Cloud.PolicyName}, function (err, data) {
        if (!err) {
            iam.listAccessKeys({UserName: userName}, function(err, data) {
                if (!err) {
                    if (data.AccessKeyMetadata.length) {
                        data.AccessKeyMetadata.forEach(function(accessKey) {
                            console.log("Got access key = " + accessKey.AccessKeyId);
                            iam.deleteAccessKey({UserName: userName, AccessKeyId: accessKey.AccessKeyId}, function(err, data) {
                                if (!err) {
                                    console.log("Deleted access key = " + accessKey.AccessKeyId);
                                    // We assume that our User would have a max of 1 access key
                                    Helper.prototype.deleteCloudUser(userName, done);
                                } else {
                                    console.error("Error deleting access key = " + accessKey.AccessKeyId);
                                    done();
                                }
                            });
                        });
                    } else {
                        Helper.prototype.deleteCloudUser(userName, done);
                    }
                } else {
                    console.error("Error getting access keys = " + err);
                }
            });
        } else {
            console.error("Could not delete user policy = " + err);
            done();
        }
    });
};

Helper.prototype.deleteCloudUser = function(userName, done) {
    iam.deleteUser({UserName: userName}, function (err, data) {
        if (!err) {
        } else {
            console.error("Could not delete user = " + err);
        }
        done();
    });
};

module.exports = new Helper();