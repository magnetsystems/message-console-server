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
    var samplesDir = ENV_CONFIG.App.samplesDir || './';
    if(fs.existsSync(samplesDir+'quickstart-android/'+CONFIGS.android.quickstart))
        fs.unlinkSync(samplesDir+'quickstart-android/'+CONFIGS.android.quickstart);
    if(fs.existsSync(samplesDir+'rpsls-android/'+CONFIGS.android.rpsls))
        fs.unlinkSync(samplesDir+'rpsls-android/'+CONFIGS.android.rpsls);
    if(fs.existsSync(samplesDir+'soapbox-android/'+CONFIGS.android.soapbox))
        fs.unlinkSync(samplesDir+'soapbox-android/'+CONFIGS.android.soapbox);
    if(fs.existsSync(samplesDir+'quickstart-ios/'+CONFIGS.ios.quickstart))
        fs.unlinkSync(samplesDir+'quickstart-ios/'+CONFIGS.ios.quickstart);
    if(fs.existsSync(samplesDir+'rpsls-ios/'+CONFIGS.ios.rpsls))
        fs.unlinkSync(samplesDir+'rpsls-ios/'+CONFIGS.ios.rpsls);
    if(fs.existsSync(samplesDir+'soapbox-ios/'+CONFIGS.ios.soapbox))
        fs.unlinkSync(samplesDir+'soapbox-ios/'+CONFIGS.ios.soapbox);

};

MMXSampleApp.prototype.getSample = function(userMagnetId, mmxId, platform, sampleId, cb){
    var me = this;
    var samplesDir = ENV_CONFIG.App.samplesDir || './';
    me.getSampleConfig(userMagnetId, mmxId, platform, function(e, tmpl){
        if(e) return cb(e);
        var zip = new AdmZip();
        zip.addLocalFolder(samplesDir+sampleId+'-'+platform);
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
