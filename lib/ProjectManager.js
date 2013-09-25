var hash = require('./modules/hash')
, orm = require('./orm')
, fs = require('fs')
, ejs = require('ejs')
, magnetId = require('node-uuid')
, AdmZip = require('adm-zip')
, _ = require('underscore');

var ProjectManager = function(){
    this.configTmplPath = './views/file-templates/project-config.ejs';
    this.projectDir = './target/user-projects';
};

// create a project
ProjectManager.prototype.create = function(req, callback){
    req.body.magnetId = magnetId.v1();
    req.body.owner = req.session.user.magnetId;
    req.body.name = req.body.name.trim();
    req.body.artifactId = req.body.name.replace(new RegExp(' ', 'g'), '-').replace(new RegExp('_', 'g'), '-');
    req.body.groupId = req.body.artifactId.replace(new RegExp('-', 'g'), '').replace(new RegExp('_', 'g'), '');
    orm.model('Project').create(req.body).success(function(proj){
        callback(null, proj.magnetId);
    }).error(function(e){
        console.error('Model: creation of project "' + req.body.name + '" failed: ' + e);
        callback('project-creation-failed');
    });
};

// retrieve a single project given with magnetId
ProjectManager.prototype.read = function(req, callback){
    orm.model('Project').find({
        where : {
            magnetId : req.params.magnetId
        }
    }).success(function(project){
        if(project){
            callback(null, project);
        }else{
            console.error('Project: no project was found with the given magnetId');
            callback('project-not-found');
        }
    });
};

// update a project
ProjectManager.prototype.update = function(req, callback){
    var me = this;
    // check for a project matching the specified magnetId
    me.read(req, function(e, project){
        if(project){
            // validate whether the user owns this project, or the user is an admin
            if(project.owner == req.session.user.id || req.session.user.userType == 'admin'){
                // update project details
                _.extend(project, req.body);
                if(req.body.name){
                    req.body.name = req.body.name.trim();
                    project.artifactId = req.body.name.replace(new RegExp(' ', 'g'), '-').replace(new RegExp('_', 'g'), '-');
                    project.groupId = project.artifactId.replace(new RegExp('-', 'g'), '').replace(new RegExp('_', 'g'), '');
                }
                project.configFileStale = true;
                project.save().success(function(proj){
                    callback(null, proj);
                }).error(function(e){
                    console.error('Project: project "' + project.name + '" update failed: ' + e);
                    callback('error-updating-project');
                });
            }else{
                console.error('Project: user "' + req.session.user.email + '" attempted to access "' + project.name + '" but was not authorized');
                callback('project-not-authorized');
            }
        }else{
            callback(e);
        }
    });
};


// generate a project zip file
ProjectManager.prototype.getConfig = function(req, callback){
    var me = this;
    me.read(req, function(e, project){
        if(project){
            var filePath = me.projectDir+'/'+project.owner+'/'+project.magnetId+'/'+project.artifactId+'.zip';
            if(1 == 1 || project.configFileStale === true){
                me.generateConfig(project, function(e, filePath){
                    if(e){
                        console.error('Project: failed to generate a config file for project "' + project.name + '": '+e);
                        callback(e);
                    }else{
                        project.configFileStale = false;
                        project.save().success(function(){
                            callback(null, filePath);
                        }).error(function(e){
                            console.error('Project: project "' + project.name + '" update failed: ' + e);
                            callback('error-updating-project');
                        });
                    }
                });
            }else{
                console.info('Project: requested cached version of project config file for project "' + project.name + '"');
                callback(null, filePath);
            }
        }else{
            callback(e);
        }
    });
};

// generate a new project config file and return path to file
ProjectManager.prototype.generateConfig = function(project, callback){
    var me = this;
    me.renderConfig(project, function(output){
        me.createProjectFolders(project.owner, project.magnetId, function(e, path){
            if(e){
                callback(e);
            }else{
                me.createFile(path+'/'+project.artifactId+'.mapp', output, function(e, configFilePath){
                    if(e){
                        console.error('Project: failed to write config file: '+e);
                        callback(e);
                    }else{
                        console.info('Project: created config file: "'+project.artifactId+'.mapp" in "'+path+'"');
                        var apnsCertPath = path+'/'+project.apnsCertName;
                        if(!project.apnsCertName || project.apnsCertName.trim().length == 0) apnsCertPath = null;
                        me.createConfigZip(path, project.artifactId, configFilePath, apnsCertPath, function(zipPath){
                            callback(null, zipPath);
                        });
                    }
                });
            }
        });
    });
};

// create project configuration zip and return path
ProjectManager.prototype.createConfigZip = function(projectPath, filename, configFilePath, apnsCertPath, callback){
    var me = this, path = require('path'), targetPath = projectPath+'/'+filename+'.zip';
    var zip = new AdmZip();
    zip.addLocalFile(configFilePath);
    if(apnsCertPath && path.existsSync(apnsCertPath)){
        zip.addLocalFile(apnsCertPath);
    }
    zip.writeZip(targetPath);
    console.info('Project: created config zip: "'+filename+'.zip"');
    callback(targetPath);
};

// create if not exist user and project folders
ProjectManager.prototype.createProjectFolders = function(userId, projectId, callback){
    var me = this;
    var path = me.projectDir;
    me.createFolderIfNotExist(path, userId, function(e){
        if(e){
            console.error('Project: failed to create user folder: '+e);
            callback(e);
        }else{
            path += '/'+userId;
            me.createFolderIfNotExist(path, projectId, function(e){
                if(e){
                    console.error('Project: failed to create project folder: '+e);
                    callback(e);
                }else{
                    path += '/'+projectId;
                    callback(null, path);
                }
            });
        }
    });
};

// render project config file
ProjectManager.prototype.renderConfig = function(project, callback){
    console.log(project);
    if(project.apnsCertName && project.apnsCertName.trim().length == 0){
        delete project.apnsCertName;
    }
    console.log('after', project);
    callback(ejs.render(fs.readFileSync(this.configTmplPath, 'ascii'), {
        settings : project
    }));
};

// create a folder if it doesnt exist
ProjectManager.prototype.createFolderIfNotExist = function(path, folder, callback){
    fs.mkdir(path+'/'+folder, function(e){
        if(!e || (e.code === 'EEXIST')){
            callback();
        }else{
            console.error(e);
            callback(e);
        }
    });
    /* TODO: upgrade nodejs version to support checking path
    var path = require(path);
    path.exists(folder, function(exists){
        if(!exists){
            fs.mkdir(path, function(e){
                if(!e || (e.code === 'EEXIST')){
                    callback();
                }else{
                    console.error(e);
                    callback(e);
                }
            });
        }
    });
    */
};

// write a file given file path and input string
ProjectManager.prototype.createFile = function(filePath, str, callback){
    fs.writeFile(filePath, str, function(e){
        if(e){
            console.log(e);
        }else{
            callback(null, filePath);
        }
    });
};

// store an uploaded project file to file system
ProjectManager.prototype.storeProjectFile = function(req, callback){
    var me = this;
    me.read(req, function(e, project){
        if(project){
            me.createProjectFolders(project.owner, project.magnetId, function(e, path){
                if(e){
                    callback(e);
                }else{
                    // stream to project file path
                    var fileName = req.header('x-file-name');
                    var fileType = req.header('X-Mime-Type');
                    var ws = fs.createWriteStream(path+'/'+fileName);
                    req.on('data', function(data){
                        ws.write(data);
                    });
                    req.on('end', function(){
                        ws.end();
                        project.configFileStale = true;
                        project.apnsCertName = fileName;
                        project.save().success(function(){
                            console.info('Project: uploaded file: "'+fileName+'", type: "'+fileType+'" in "'+path+'"');
                            callback();
                        }).error(function(e){
                                console.error('Project: project "' + project.name + '" update failed: ' + e);
                                callback('error-updating-project');
                            });
                    });
                    ws.on('error', function(e){
                        console.log('Project: error uploading project file: '+e);
                        callback('error-uploading-file');
                    });

                }
            });
        }else{
            callback(e);
        }
    });
};

// delete APNS certificate
ProjectManager.prototype.removeAPNSCertificate = function(req, callback){
    var me = this;
    me.read(req, function(e, project){
        if(project){
            var filePath = me.projectDir+'/'+project.owner+'/'+project.magnetId+'/'+project.apnsCertName;
            fs.unlink(filePath, function(e){
                if(e){
                    console.error('Project: failed to delete project file "'+project.apnsCertName+'": '+e);
                    callback('error-deleting-file');
                }else{
                    project.configFileStale = true;
                    project.apnsCertName = '';
                    project.save().success(function(){
                        callback(null, filePath);
                    }).error(function(e){
                            console.error('Project: project "' + project.name + '" update failed: ' + e);
                            callback('error-updating-project');
                        });
                }
            });
        }else{
            callback(e);
        }
    });
};

module.exports = new ProjectManager();