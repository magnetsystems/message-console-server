var ejs = require('ejs')
, fs = require('fs')
, MMXManager = require('./MMXManager')
, JSZip = require("jszip");

var CONFIGS = {
    android : {
        quickstart : 'quickstart-android/app/src/main/res/raw/quickstart.properties',
        rpsls      : 'rpsls-android/app/src/main/res/raw/rpsls.properties',
        soapbox    : 'soapbox-android/app/src/main/res/raw/soapbox.properties'
    },
    ios     : {
        quickstart : 'quickstart-ios/QuickStart/Configurations.plist',
        rpsls      : 'rpsls-ios/RPSLS/Configurations.plist',
        soapbox    : 'soapbox-ios/Soapbox/Configurations.plist'
    }
};

var TEMPLATES = {
    android : fs.readFileSync('./views/file-templates/sample-android-config.ejs', 'ascii'),
    ios     : fs.readFileSync('./views/file-templates/sample-ios-config.ejs', 'ascii')
};

var MMXSampleApp = function(){};

MMXSampleApp.prototype.getSample = function(userMagnetId, mmxId, platform, sampleId, cb){
    var me = this;
    var samplesDir = (ENV_CONFIG.App.samplesDir && ENV_CONFIG.App.samplesDir != './') ? ENV_CONFIG.App.samplesDir : '';
    me.getSampleConfig(userMagnetId, mmxId, platform, function(e, tmpl){
        if(e) return cb(e);
        fs.readFile(samplesDir+sampleId+'-'+platform+'.zip', function(e, data){
            if(e) return cb('unable-to-create');
            var zip = new JSZip(data);
            zip.file(CONFIGS[platform][sampleId], new Buffer(tmpl));
            cb(null, zip.generate({
                type : 'nodebuffer'
            }));
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
