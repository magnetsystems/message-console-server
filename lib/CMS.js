var orm = require('./orm')
, fs = require('fs')
, ejs = require('ejs')
, magnetId = require('node-uuid');

var CMS = function(){
    this.cmsDir = './views-cms';
    fs.mkdir(this.cmsDir, function(e){
        if(!e || (e.code === 'EEXIST')){
            winston.verbose('CMS: view folder ready.');
        }else{
            winston.error('CMS: failed to create view folder: ',e);
        }
    });
};

CMS.prototype.createFile = function(folder, filename, str, callback){
    var filePath = this.cmsDir+'/'+folder+'/'+filename;
    fs.writeFile(filePath, str, function(e){
        if(e){
            winston.error('CMS: failed to write file "'+filePath+'": ',e);
            callback('error-creating-file');
        }else{
            callback(null, filePath);
        }
    });
};

CMS.prototype.getPage = function(params, folder, filename, callback){
    var me = this;
    var filePath = me.cmsDir+'/'+folder+'/'+filename;
    fs.readFile(filePath, 'ascii', function(e, tmpl){
        if(e)
            callback('no-file-exists');
        else
            callback(null, ejs.render(tmpl, params));
    });
};

module.exports = new CMS();