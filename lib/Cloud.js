var AWS = require('aws-sdk');

var Cloud = function(){};

AWS.config.update(ENV_CONFIG.AWS);
var iam = new AWS.IAM({apiVersion: ENV_CONFIG.Cloud.AWS.IAMApiVersion});

Cloud.prototype.allocateCloudAccount = function(userName, callback){

    var me = this;

    iam.getUser({UserName: userName}, function(err, data) {
        if (!err) {
            winston.log("Got user = " + data.User.UserName);

            iam.listAccessKeys({UserName: userName}, function(err, data) {
                if (!err) {
                    data.AccessKeyMetadata.forEach(function(accessKey) {
                        winston.log("Got access key = " + accessKey.AccessKeyId);
                        iam.deleteAccessKey({UserName: userName, AccessKeyId: accessKey.AccessKeyId}, function(err, data) {
                            if (!err) {
                                winston.log("Deleted access key = " + accessKey.AccessKeyId);
                            } else {
                                winston.error("Error deleting access key = " + accessKey.AccessKeyId);
                            }
                        });
                    });
                    // We have all the existing keys that will be deleted, so it's safe to call this method now
                    me.setUserAccessPolicy(userName, callback);

                } else {
                    winston.error("Error getting access keys = " + err);
                }
            });
        } else {
            winston.error("Error getting user = " + err);
            // User does not exist!
            iam.createUser({UserName: userName}, function(err, data) {
                if (!err) {
                    winston.log("Created user %s with id: %s", data.User.UserName, data.User.UserId);
                    me.setUserAccessPolicy(userName, callback);
                } else {
                    winston.error("Error creating user = " + err);
                    callback(err, null);
                }
            });
        }
    });
};

Cloud.prototype.setUserAccessPolicy = function(userName, callback){
    // Create the access keys!
    iam.createAccessKey({UserName: userName}, function(err, data) {
        if (!err) {
            winston.log("Created access key %s for user %s" , data.AccessKey.AccessKeyId, data.AccessKey.UserName);

            // TODO: Move to constants
            var constants = {
                'USER_SANDBOX_ACCESS_POLICY' : ENV_CONFIG.Cloud.PolicyName,
                'ALLOWED_BUCKET_ACTIONS' : 'AllowedBucketActions',
                'ALLOWED_FOLDER_ACTIONS' : 'AllowedFolderActions',
                'ALLOWED_OBJECT_ACTIONS' : 'AllowedObjectActions',
                'BUCKET_NAME' : ENV_CONFIG.Cloud.AWS.BucketName
            }

            var folderKey = userName;
            var policyDocument = "{\"Version\":\"2012-10-17\",\"Statement\": [" +
                "{\"Sid\": \"" + constants.ALLOWED_BUCKET_ACTIONS + "\"," +
                "\"Effect\":\"Allow\"," +
                "\"Action\": [" +
                "\"s3:GetBucketLocation\"," +
                "\"s3:GetBucketVersioning\"," +
                "\"s3:GetBucketNotification\"" +
                "]," +
                "\"Resource\": \"arn:aws:s3:::" + constants.BUCKET_NAME + "\"" +
                "}," +
                "{\"Sid\": \"" + constants.ALLOWED_FOLDER_ACTIONS + "\"," +
                "\"Effect\":\"Allow\"," +
                "\"Action\": [" +
                "\"s3:ListBucket\"," +
                "\"s3:ListBucketMultipartUploads\"," + // TODO [EmreV] WON-5098: unable to verify permission - test code is still getting AccessDenied
                "\"s3:ListBucketVersions\"" +
                "]," +
                "\"Resource\": \"arn:aws:s3:::" + constants.BUCKET_NAME + "\"" +
                ", \"Condition\": {\"StringLike\": {\"s3:prefix\": \"" + folderKey + "\"}}" +
                "}," +
                "{\"Sid\": \"" + constants.ALLOWED_OBJECT_ACTIONS + "\"," +
                "\"Effect\":\"Allow\"," +
                "\"Action\": [" +
                "\"s3:PutObject\"," +
                "\"s3:PutObjectAcl\"," +
                "\"s3:PutObjectVersionAcl\"," +
                "\"s3:GetObject\"," +
                "\"s3:GetObjectVersion\"," +
                "\"s3:GetObjectAcl\"," +
                "\"s3:GetObjectVersionAcl\"," +
                "\"s3:GetObjectTorrent\"," +
                "\"s3:GetObjectVersionTorrent\"," +
                "\"s3:DeleteObject\"," +
                "\"s3:DeleteObjectVersion\"," +
                "\"s3:RestoreObject\"," +
                "\"s3:AbortMultipartUpload\"," +
                "\"s3:ListMultipartUploadParts\"" +
                "]," +
                "\"Resource\": \"arn:aws:s3:::" + constants.BUCKET_NAME + "/" + folderKey + "/*\"" +
                "}" +
                "]}";

            winston.log("policy document = \n" + policyDocument);
            var accessKeyId = data.AccessKey.AccessKeyId;
            var secretAccessKey = data.AccessKey.SecretAccessKey;
            iam.putUserPolicy({UserName: data.AccessKey.UserName, PolicyName: constants.USER_SANDBOX_ACCESS_POLICY, PolicyDocument: policyDocument}, function(err, data) {
                if (!err) {
                    winston.log("Applied policy for user!");
                    callback(null, {AccessKeyId: accessKeyId, SecretAccessKey: secretAccessKey});
                } else {
                    winston.error("Error applying policy = " + err);
                    callback(err, null);
                }
            });
        } else {
            winston.error("Error creating access key = " + err);
            callback(err, null);
        }
    });
};

module.exports = new Cloud();
