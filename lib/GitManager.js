var git = require('gift')
, fs = require('fs')
, Jobs = require('./Jobs');

var GIT_DIR = 'views';

var LATEST_COMMIT;

var GitManager = function(){
    var me = this;
    me.repo = null;
    me.checkoutOrClone(function(){
        winston.info('Git: initialization of version control system complete for directory: '+GIT_DIR+' on branch: '+ENV_CONFIG.CMS.branchName);
        Jobs.create('GitUpdate', APP_CONFIG.gitSyncInterval, function(opts){
            me.sync(opts.success, opts.error);
        });
        Jobs.start('GitUpdate', function(job, hasFailed){
            if(!hasFailed){
                winston.verbose('Git: synchronization with remote branch: '+ENV_CONFIG.CMS.branchName+' complete at commit hash: '+LATEST_COMMIT);
            }
        });
    });
};

// checkout or clone repository
GitManager.prototype.checkoutOrClone = function(callback){
    var me = this;
    me.initAndCheckout(function(e){
        if(e){
            me.clone(callback);
        }else{
            callback();
        }
    });
};

// clone the repository
GitManager.prototype.clone = function(callback){
    var me = this;
    git.clone(ENV_CONFIG.CMS.repo, GIT_DIR, function(e, repo){
        if(e && e.code == 128){
            winston.info('Git: deleting and recreating folder "'+GIT_DIR+'" which was not under source control.');
            deleteFolder('./'+GIT_DIR);
            me.clone(callback);
        }else if(e){
            winston.error('Git: error cloning repo: ', e);
            throw(e);
        }else{
            me.repo = repo;
            me.checkout(callback);
        }
    });
};

// initialize and checkout the repository
GitManager.prototype.initAndCheckout = function(callback){
    var me = this;
    git.init(GIT_DIR, function(e, repo){
        if(e && e.code == 'ENOENT'){
            winston.info('Git: the folder "'+GIT_DIR+'" did not exist, attempting to clone repository.');
            callback('missing-git-folder');
        }else{
            me.repo = repo;
            me.checkout(callback);
        }
    });
};

// checkout the repository
GitManager.prototype.checkout = function(callback){
    this.repo.checkout(ENV_CONFIG.CMS.branchName, function(e, report){
        if(e){
            winston.error('Git: error checking out branch: ', e);
            callback('error-checkout-branch');
        }else{
            winston.info(report);
            callback(null, report);
        }
    });
};

// sync branch with remote
GitManager.prototype.sync = function(callback, failback){
    var me = this;
    me.repo.branches(function(e, heads){
        if(e){
            winston.error('Git: error checking out branch: ', e);
            failback('branch-retrieval-error');
        }else{
            var branch;
            for(var key in heads){
                if(heads[key].name && heads[key].name == ENV_CONFIG.CMS.branchName){
                    branch = heads[key];
                }
            }
            if(branch){
                LATEST_COMMIT = heads[key].commit.id;
                me.repo.sync('origin', ENV_CONFIG.CMS.branchName, function(e){
                    if(e){
                        winston.error('Git: unable to synchronize branch: '+ENV_CONFIG.CMS.branchName);
                        failback('branch-sync-error');
                    }else{
                        callback();
                    }
                });
            }else{
                winston.error('Git: branch: '+ENV_CONFIG.CMS.branchName+' not found.');
                failback('branch-not-found');
            }
        }
    });
};

// add and commit changes to remote
GitManager.prototype.commit = function(str, callback){
    var me = this;
    me.repo.add('-u', function(e){
        if(e){
            winston.error('Git: error adding files for commit: ', e);
            callback('commit-add-error');
        }else{
            me.repo.commit(str, {}, function(e){
                if(e){
                    winston.error('Git: error committing changes: ', e);
                    callback('commit-error');
                }else{
                    winston.verbose('Git: successfully committed changes to Git.');
                    callback();
                }
            });
        }
    });
};

var deleteFolder = function(path){
    if(fs.existsSync(path)){
        fs.readdirSync(path).forEach(function(file){
            var curPath = path + '/' + file;
            if(fs.lstatSync(curPath).isDirectory()){
                deleteFolder(curPath);
            }else{
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

module.exports = new GitManager();