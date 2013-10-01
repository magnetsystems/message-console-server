/**
 * Created with JetBrains WebStorm.
 * User: pshah
 * Date: 9/30/13
 * Time: 10:16 PM
 * To change this template use File | Settings | File Templates.
 */
var AWS = require('aws-sdk');
var CloudConfig = require("../lib/config/CloudConfig");

AWS.config.loadFromPath('./lib/config/aws-config.json');
var iam = new AWS.IAM({apiVersion: CloudConfig.AWS.IAMApiVersion});

var CloudHelper = function(){};

CloudHelper.prototype.removeUser = function(userName, done) {
    // Cleanup: Delete policy, keys and then User
    // We assume that our User would have a max of 1 access key
    iam.deleteUserPolicy({UserName: userName, PolicyName: CloudConfig.PolicyName}, function (err, data) {
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
                                    CloudHelper.prototype.deleteCloudUser(userName, done);
                                } else {
                                    console.error("Error deleting access key = " + accessKey.AccessKeyId);
                                    done();
                                }
                            });
                        });
                    } else {
                        CloudHelper.prototype.deleteCloudUser(userName, done);
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

CloudHelper.prototype.deleteCloudUser = function(userName, done) {
    iam.deleteUser({UserName: userName}, function (err, data) {
        if (!err) {
        } else {
            console.error("Could not delete user = " + err);
        }
        done();
    });
};

module.exports = new CloudHelper();