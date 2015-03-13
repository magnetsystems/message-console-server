var fs = require('fs')
, ejs = require('ejs')
, _ = require('underscore')
, nodeHost = require('os').hostname();

var contains = /.ejs/i;

var stripChars = /[^a-zA-Z0-9-_]/gmi;

var SKIP_LAYOUTS = ['admin', 'dev', 'email', 'file-templates', 'layouts'];

var ContentManagement = function(){
    this.pageDir = './views';
};

// called from REST API to obtain a list of the pages in the file system
ContentManagement.prototype.getPageList = function(callback){
    this.traverse(this.pageDir, function(e, ary){
        if(typeof ary === 'object') ary.sort(function(a, b){
            if(typeof a.folder === 'undefined'){
                return -1;
            }else if(typeof b.folder === 'undefined'){
                return 1;
            }else{
                if(a.folder.toLowerCase() < b.folder.toLowerCase()) return -1;
                if(a.folder.toLowerCase() > b.folder.toLowerCase()) return 1;
            }
            return 0;
        });
        callback(e, ary);
    });
};

// recursively loop through the CMS managed folders and files in the file system
ContentManagement.prototype.traverse = function(dir, done){
    var results = [];
    var me = this;
    fs.readdir(dir, function(e, list){
        if(e) return done(e);
        var pending = list.length;
        if(!pending) return done(null, results);
        list.forEach(function(filename){
            var path = dir + '/' + filename;
            fs.stat(path, function(err, stat){
                if(stat && stat.isDirectory()){
                    if(path.indexOf('/admin') == -1 && path.indexOf('/layouts') == -1 && path.indexOf('/wizard') == -1 && path.indexOf('/file-templates') == -1){
                        me.traverse(path, function(err, res){
                            if(isValidArray(res)) results = results.concat(res);
                            if(!--pending) done(null, results);
                        });
                    }else{
                        if(!--pending) done(null, results);
                    }
                }else{
                    if(contains.test(path)){
                        var ary = path.replace(me.pageDir, '').split('/');
                        var entry = {
                            filename : (ary.length > 2 ? ary[2] : ary[1]).replace(contains, ''),
                            folder   : ary.length > 2 ? ary[1] : undefined
                        };
                        if(entry.folder && _.contains(SKIP_LAYOUTS, entry.folder)){
                            entry.noLayout = true;
                        }
                        results.push(entry);
                    }
                    if(!--pending) done(null, results);
                }
            });
        });
    });
};

// called from REST API to view the template-rendered contents of a single page
ContentManagement.prototype.viewPageContent = function(req, callback){
    var me = this;
    var filePath = me.pageDir+(typeof req.body.folder != 'undefined' ? '/'+req.body.folder.replace(stripChars, '') : '')+'/'+req.body.filename.replace(stripChars, '')+'.ejs';
    winston.silly('CMS: retrieving CMS content for editing: '+filePath);
    fs.readFile(filePath, 'ascii', function(e, tmpl){
        if(e){
            winston.error('CMS: failed to get file "'+filePath+'" at '+nodeHost+': ', e);
            callback('no-file-exists');
        } else{
            if(req.body.isPreview === true){
                tmpl = ejs.render(tmpl, {
                    locals : {
                        title           : 'Preview Mode',
                        activePage      : 'none',
                        sessionUser     : req.session.user,
                        userType        : 'developer',
                        envConfig       : ENV_CONFIG,
                        body            : '~~~Magnet_Layout_Body~~~'
                    },
                    _layoutFile : false
                });
            }
            callback(null, tmpl);
        }
    });
};

// called from REST API to update the contents of a page
ContentManagement.prototype.updateSinglePage = function(req, callback){
    var me = this;
    var folder = (typeof req.body.folder != 'undefined' ? '/'+req.body.folder.replace(stripChars, '') : '');
    var filename = req.body.filename.replace(stripChars, '');
    me.writePage(folder, filename, req.body.data, function(e){
        if(e){
            callback(e);
        }else{
            callback();
        }
    });
};

// write a page to the file system
ContentManagement.prototype.writePage = function(folder, filename, content, callback){
    var filePath = this.pageDir+(typeof folder != 'undefined' ? '/'+folder.replace(stripChars, '') : '')+'/'+filename.replace(stripChars, '')+'.ejs';
    fs.writeFile(filePath, content, function(e){
        if(e){
            winston.error('CMS: failed to write file "'+filePath+'" at '+nodeHost+': ', e);
            callback('error-updating-file');
        }else{
            callback(null, filePath);
        }
    });
};

function isValidArray(val){
    return Object.prototype.toString.call(val) === '[object Array]' && val.length > 0;
}

module.exports = new ContentManagement();