var orm = require('./orm')
, seq = orm.seq()
, fs = require('fs')
, ejs = require('ejs')
, Jobs = require('./Jobs')
, _ = require('underscore')
, qs = require('querystring')
, GitManager = require('../lib/GitManager')
, nodeHost = require('os').hostname();

var contains = /.ejs/i;

var stripChars = /[^a-zA-Z0-9-_]/gmi;

var SKIP_LAYOUTS = ['admin', 'dev', 'email', 'file-templates', 'layouts'];

var LATESTID;

var ContentManagement = function(){
    var me = this;
    this.pageDir = './views';
//    Jobs.create('CMSPages', ENV_CONFIG.CMS.syncInterval, function(opts){
//        me.checkForUpdates(opts.success, opts.error);
//    });
//    Jobs.start('CMSPages', function(job, hasFailed){
//        if(!hasFailed){
//            LATESTID = job.out;
//            winston.verbose('CMS: all page content is up-to-date at '+nodeHost+'. Current as of id: '+LATESTID);
//        }
//    });
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
                    if(path.indexOf('/admin') == -1){
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
    winston.verbose('CMS: retrieving CMS content for editing: '+filePath);
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
                        homePageVideoID : APP_CONFIG.homePageVideoID,
                        body            : '~~~Magnet_Layout_Body~~~'
                    },
                    _layoutFile : false
                });
            }
            callback(null, tmpl);
        }
    });
};

// called from REST API to update the contents of a page by creating a CMSPage record in the database
ContentManagement.prototype.updateSinglePage = function(req, callback){
    var me = this;
    var folder = (typeof req.body.folder != 'undefined' ? '/'+req.body.folder.replace(stripChars, '') : '');
    var filename = req.body.filename.replace(stripChars, '');
    me.writePage(folder, filename, req.body.data, function(e){
        if(e){
            callback(e);
        }else{
            GitManager.commit(folder+'/'+filename, function(e){
                callback(e);
            });
        }
    });
};

// write a page to the file system
ContentManagement.prototype.writePage = function(folder, filename, content, callback){
    var filePath = this.pageDir+(typeof folder != 'undefined' ? '/'+folder.replace(stripChars, '') : '')+'/'+filename.replace(stripChars, '')+'.ejs';
    fs.writeFile(filePath, qs.unescape(content), function(e){
        if(e){
            winston.error('CMS: failed to write file "'+filePath+'" at '+nodeHost+': ', e);
            callback('error-updating-file');
        }else{
            callback(null, filePath);
        }
    });
};

//
//// check for page updates - NOT USED
//ContentManagement.prototype.checkForUpdates = function(callback, failback){
//    var me = this, latestId;
//    seq.query('SELECT id FROM CMSPages ORDER BY id DESC LIMIT 1;', null, {
//        raw : true
//    }).success(function(ids){
//        latestId = isValidArray(ids) ? ids[0].id : undefined;
//        if(latestId && LATESTID != latestId){
//            seq.query('SELECT id FROM CMSPages;', null, {
//                raw : true
//            }).success(function(pageIds){
//                seq.query('SELECT CMSPages.id FROM CMSPages JOIN CMSEntries ON CMSPages.id = CMSEntries.CMSPageId WHERE CMSEntries.identifier = "'+nodeHost+'";', null, {
//                    raw : true
//                }).success(function(entryIds){
//                    me.fifoUpdate(objToAryId(pageIds), objToAryId(entryIds), 0, function(){
//                        callback(latestId);
//                    });
//                }).error(failback);
//            }).error(failback);
//        }else{
//            callback(latestId);
//        }
//    }).error(failback);
//};
//
//// recursively check for pages which do not have an update entry associated with the current instance - NOT USED
//ContentManagement.prototype.fifoUpdate = function(pages, entryIds, id, callback){
//    var ctr = id || 0, me = this;
//    if(pages[ctr]){
//        if(_.contains(entryIds, pages[ctr]) === false){
//            me.updateInstance(pages[ctr], function(){
//                me.fifoUpdate(pages, entryIds, ++ctr, callback);
//            });
//        }else{
//            me.fifoUpdate(pages, entryIds, ++ctr, callback);
//        }
//    }else{
//        callback();
//    }
//};
//
//// update the current instance with the page changes and record an update entry - NOT USED
//ContentManagement.prototype.updateInstance = function(pageId, callback){
//    var me = this;
//    me.getPage(pageId, function(e, page){
//        if(page){
//            me.writePage(page.folder, page.filename, page.content, function(e, filePath){
//                if(filePath){
//                    me.createEntry(page, function(e, entry){
//                        if(entry){
//                            winston.verbose('CMS: update of page: '+(page.folder+'/'+page.filename)+' complete at '+nodeHost+'.');
//                            callback();
//                        }
//                    });
//                }else{
//                    callback();
//                }
//            });
//        }else{
//            callback();
//        }
//    });
//};
//
//// get a CMSPage record from the database by id - NOT USED
//ContentManagement.prototype.getPage = function(id, callback){
//    orm.model('CMSPage').find({
//        where : {
//            id : id
//        }
//    }).success(function(page){
//        callback(null, page);
//    }).error(function(e){
//        winston.error('CMS: retrieval of page failed at '+nodeHost+': ', e);
//        callback('page-retrieval-error');
//    });
//};
//
//// create a CMSEntry database record belonging to a CMSPage for the current instance - NOT USED
//ContentManagement.prototype.createEntry = function(model, callback){
//    var entry = orm.model('CMSEntry').build({
//        identifier : nodeHost
//    });
//    model.addCMSEntry(entry).success(function(){
//        callback(null, entry);
//    }).error(function(e){
//        winston.error('CMS: creation of page entry for '+nodeHost+' failed: ', e);
//        callback('file-update-error');
//    });
//};
//
//// create a CMSPage record in the database for tracking updates - NOT USED
//ContentManagement.prototype.createPage = function(obj, callback){
//    orm.model('CMSPage').create(obj).success(function(page){
//        callback(null, page);
//    }).error(function(e){
//        winston.error('CMS: creation of page record failed: ', e);
//        callback('file-update-error');
//    });
//};

function isValidArray(val){
    return Object.prototype.toString.call(val) === '[object Array]' && val.length > 0;
}

function objToAryId(ary){
    for(var i=0;i<ary.length;++i) ary[i] = ary[i].id;
    return ary;
}

module.exports = new ContentManagement();