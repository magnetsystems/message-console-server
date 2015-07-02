var AdmZip = require('adm-zip')
, ejs = require('ejs')
, fs = require('fs')
, MMXManager = require('./MMXManager');

var CONFIGS = {
    android : {
        quickstart : 'app/src/main/res/raw/quickstart.properties',
        rpsls      : 'app/src/main/res/raw/rpsls.properties',
        soapbox    : 'app/src/main/res/raw/soapbox.properties'
    },
    ios     : {
        quickstart : 'QuickStart/Configurations.plist',
        rpsls      : 'RPSLS/Configurations.plist',
        soapbox    : 'Soapbox/Configurations.plist'
    }
};

var TEMPLATES = {
    android : fs.readFileSync('./views/file-templates/sample-android-config.ejs', 'ascii'),
    ios     : fs.readFileSync('./views/file-templates/sample-ios-config.ejs', 'ascii')
};

var MMXSampleApp = function(){
    if(fs.existsSync('./quickstart-android/'+CONFIGS.android.quickstart))
        fs.unlinkSync('./quickstart-android/'+CONFIGS.android.quickstart);
    if(fs.existsSync('./rpsls-android/'+CONFIGS.android.rpsls))
        fs.unlinkSync('./rpsls-android/'+CONFIGS.android.rpsls);
    if(fs.existsSync('./soapbox-android/'+CONFIGS.android.soapbox))
        fs.unlinkSync('./soapbox-android/'+CONFIGS.android.soapbox);
    if(fs.existsSync('./quickstart-ios/'+CONFIGS.ios.quickstart))
        fs.unlinkSync('./quickstart-ios/'+CONFIGS.ios.quickstart);
    if(fs.existsSync('./rpsls-ios/'+CONFIGS.ios.rpsls))
        fs.unlinkSync('./rpsls-ios/'+CONFIGS.ios.rpsls);
    if(fs.existsSync('./soapbox-ios/'+CONFIGS.ios.soapbox))
        fs.unlinkSync('./soapbox-ios/'+CONFIGS.ios.soapbox);

};

MMXSampleApp.prototype.getSample = function(userMagnetId, mmxId, platform, sampleId, cb){
    var me = this;
    me.getSampleConfig(userMagnetId, mmxId, platform, function(e, tmpl){
        if(e) return cb(e);
        var zip = new AdmZip();
        zip.addLocalFolder(sampleId+'-'+platform);
        zip.addFile(CONFIGS[platform][sampleId], new Buffer(tmpl), 'sample data');
        zip.toBuffer(function(buffer){
            cb(null, buffer);
        }, function(){
            cb('unable-to-create');
        });
    });
};

MMXSampleApp.prototype.getSampleConfig = function(userMagnetId, mmxId, platform, cb){
    if(!platform) return cb('invalid-platform');
    MMXManager.getApp(userMagnetId, mmxId, function(e, app){
        if(e) return cb(e);
        MMXManager.getConfigs(userMagnetId, function(e, mmxconfig){
            if(e) return cb(e);
            cb(null, ejs.render(TEMPLATES[platform], {
                params    : app,
                config    : ENV_CONFIG,
                mmxconfig : mmxconfig
            }));
        });
    });
};

module.exports = new MMXSampleApp();
