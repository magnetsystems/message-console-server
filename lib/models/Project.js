var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        name : Seq.STRING,
        version : Seq.STRING,
        description : Seq.STRING,
        artifactId : Seq.STRING,
        groupId : Seq.STRING,
        magnetId : {
            type     : Seq.STRING,
            unique   : true,
            validate : { isUUID : 1 }
        },
        fbClientId : Seq.STRING,
        emailEnabled : Seq.BOOLEAN,
        smtpUsername : Seq.STRING,
        apnsHost : Seq.STRING,
        facebookEnabled : Seq.BOOLEAN,
        salesforceEnabled : Seq.BOOLEAN,
        fbClientSecret : Seq.STRING,
        apnsEnabled : Seq.BOOLEAN,
        liClientId : Seq.STRING,
        smtpPassword : Seq.STRING,
        jdbcPort : Seq.INTEGER,
        jdbcUser : Seq.STRING,
        jdbcName : Seq.STRING,
        smtpSenderName : Seq.STRING,
        apnsPassword : Seq.STRING,
        smtpPort : Seq.INTEGER,
        encryptionEnabled : Seq.BOOLEAN,
        sfdcClientId : Seq.STRING,
        smtpHostName : Seq.STRING,
        sfdcClientSecret : Seq.STRING,
        gcmApiKey : Seq.STRING,
        useGeoLocation : Seq.BOOLEAN,
        gcmSenderId : Seq.STRING,
        linkedinEnabled : Seq.BOOLEAN,
        jdbcPassword : Seq.STRING,
        gcmEnabled : Seq.BOOLEAN,
        jdbcHost : Seq.STRING,
        smtpSenderEmail : Seq.STRING,
        liClientSecret : Seq.STRING,
        sfdcClientEndpointAddress: Seq.STRING,
        userAuth : Seq.STRING,
        wsdlUrls : Seq.STRING,
        helloWorldControllerEnabled : Seq.BOOLEAN,
        sampleEntityEnabled : Seq.BOOLEAN,
        apnsCertName : Seq.STRING,
        configFileStale : {type : Seq.BOOLEAN, defaultValue : true}
    },
    relations : [{
        type  : 'belongsTo',
        model : 'User',
        constraints : {
            onDelete : 'cascade'
        }
    }, {
        type  : 'hasMany',
        model : 'WSDL'
    }]
};