var AdmZip = require('adm-zip')
, ejs = require('ejs')
, fs = require('fs')
, MMXManager = require('./MMXManager');

var CONFIGS = {
    android : 'app/src/main/res/raw/quickstart.properties',
    ios     : 'MMXQuickStart/MMXQuickStart/Configurations.plist'
};

var TEMPLATES = {
    android : fs.readFileSync('./views/file-templates/sample-android-config.ejs', 'ascii'),
    ios     : fs.readFileSync('./views/file-templates/sample-ios-config.ejs', 'ascii')
};

var MMXSampleApp = function(){
    if(fs.existsSync('./quickstart-android/'+CONFIGS.android))
        fs.unlinkSync('./quickstart-android/'+CONFIGS.android);
    if(fs.existsSync('./quickstart-ios/'+CONFIGS.ios))
        fs.unlinkSync('./quickstart-ios/'+CONFIGS.ios);

};

MMXSampleApp.prototype.getSample = function(userMagnetId, mmxId, platform, cb){
    if(!platform) return cb('invalid-platform');
    MMXManager.getApp(userMagnetId, mmxId, function(e, app){
        if(e) return cb(e);
        MMXManager.getConfigs(userMagnetId, function(e, mmxconfig){
            if(e) return cb(e);
            if(mmxconfig.configs['push.callbackurl'] && mmxconfig.configs['push.callbackurl'] !== '')
                mmxconfig.configs['push.callbackurl'] = mmxconfig.configs['push.callbackurl'].trim().replace('http://', '').replace('https://', '');
            var zip = new AdmZip();
            var tmpl = ejs.render(TEMPLATES[platform], {
                params    : app,
                config    : ENV_CONFIG,
                mmxconfig : mmxconfig
            });
            zip.addLocalFolder('quickstart-'+platform);
            zip.addFile(CONFIGS[platform], new Buffer(tmpl), 'sample data');
            zip.toBuffer(function(buffer){
                cb(null, buffer);
            }, function(){
                cb('unable-to-create');
            });
        });
    });
};

module.exports = new MMXSampleApp();
