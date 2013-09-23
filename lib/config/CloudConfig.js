module.exports = {
    Uploader: {
        UserName: 'NodeJsUploadTest@magnet.com',
        AccessKeyId: 'AKIAIM6LNU6WAMS5ENIQ',
        SecretAccessKey: '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'
    },
    PolicyName : 'User-Sandbox-Access-Policy',
    AWS: {
        S3ApiVersion : '2006-03-01',
        IAMApiVersion: '2010-05-08',
        BucketName: 'magnet-audit-test',
        SomeOtherBucketName: 'pshahtest' // The user should not be able to upload to this bucket!
    }
}