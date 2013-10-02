/* Development Environment Variables */

module.exports = {

    // App Configuration
    App : {
        port          : 3000,
        sessionSecret : 'ThisSecretShouldBeChanged'
    },

    // Database Configuration
    Database : {
        doSync   : true,
        dbName   : 'developercenter',
        username : 'root',
        password : null,
        params   : {
            host : 'localhost',
            port : 3306
        }
    },

    // Email Server Credentials and Paths
    Email : {
        host	     : 'email-smtp.us-east-1.amazonaws.com',
        user 	     : 'AKIAIP33ZPLKNMI3IGSQ',
        port         : 587,
        password     : 'At4tncVDTXBmcoIN931USUe1NYIUjNULsuLmlwPmikjs',
        sender       : 'Magnet Developer Factory <no-reply@magnet.com>',
        supportEmail : 'manager1@magnetapi.com', // TODO: set to correct email
        appUrl       : 'http://localhost:3000',
        resourceUrl  : 'http://localhost:3000/resources'
    },

    // AWS Cloud Credentials
    Cloud : {
        Uploader : {
            UserName        : 'NodeJsUploadTest@magnet.com',
            AccessKeyId     : 'AKIAIM6LNU6WAMS5ENIQ',
            SecretAccessKey : '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'
        },
        PolicyName : 'User-Sandbox-Access-Policy',
        AWS : {
            S3ApiVersion        : '2006-03-01',
            IAMApiVersion       : '2010-05-08',
            BucketName          : 'magnet-audit-test',
            SomeOtherBucketName : 'pshahtest' // The user should not be able to upload to this bucket!
        }
    },

    // AWS SDK Configuration Object
    AWS : {
        accessKeyId     : 'AKIAIO2JM4EVCJUGXNBQ',
        secretAccessKey : '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',
        region          : 'us-east-1'
    }

};