var orm = require('./orm')
, ProjectModel = require('./models/Project')
, fs = require('fs')
, ejs = require('ejs')
, magnetId = require('node-uuid')
, AdmZip = require('adm-zip')
, UserManager = require('./UserManager')
, WSDLManager = require('../lib/WSDLManager')
, _ = require('underscore');

var ProjectManager = function(){
    var me = this;
    me.configTmplPath = './views/file-templates/project-config.ejs';
    me.projectDir = './tmp/user-projects';
    me.createFolderIfNotExist('.', 'tmp', function(e){
        if(e && (e.code !== 'EEXIST')){
            throw new Error('ProjectManager: could not create ./log directory: ', e);
        }else{
            me.createFolderIfNotExist('./tmp', 'user-projects', function(e){
                if(e && (e.code !== 'EEXIST')){
                    throw new Error('ProjectManager: could not create ./log/user-projects directory: ', e);
                }
            });
        }
    });
};

// create a project
ProjectManager.prototype.create = function(userMagnetId, body, callback){
    UserManager.read(userMagnetId, false, function(e, user){
        if(user){
            if(body){
                body.magnetId = magnetId.v1();
                body.name = body.name ? body.name.trim() : '';
                body.artifactId = body.name.replace(new RegExp(' ', 'g'), '-').replace(new RegExp('_', 'g'), '-');
                body.groupId = body.artifactId.replace(new RegExp('-', 'g'), '').replace(new RegExp('_', 'g'), '');
                orm.model('Project').create(body).success(function(project){
                    user.addProject(project).success(function(){
                        callback(null, project);
                    }).error(function(e){
                        winston.error('Model: creation of project "' + body.name + '" failed: ',e);
                        callback('project-creation-failed');
                    });
                }).error(function(e){
                    winston.error('Model: creation of project "' + body.name + '" failed: ',e);
                    callback('invalid-body');
                });
            }else{
                winston.error('Model: creation of project failed: invalid body');
                callback('invalid-body');
            }
        }else{
            callback(e);
        }
    });
};

// retrieve a single project given with magnetId
ProjectManager.prototype.read = function(magnetId, callback){
    orm.model('Project').find({
        where : {
            magnetId : magnetId
        }
    }).success(function(project){
        if(project){
            callback(null, project);
        }else{
            winston.error('Project: no project was found with the given magnetId');
            callback('project-not-found');
        }
    }).error(function(e){
        winston.error('Project: error attempting to find project', e);
        callback('project-find-error');
    });
};

// update a project
ProjectManager.prototype.update = function(magnetId, userId, body, callback){
    var me = this;
    if(body){
        // check for a project matching the specified magnetId
        me.read(magnetId, function(e, project){
            if(project){
                delete body.magnetId;
                // validate whether the user owns this project, or the user is an admin
                if(project.UserId == userId){
                    if(body.name){
                        body.name.trim();
                        body.artifactId = body.name.replace(new RegExp(' ', 'g'), '-').replace(new RegExp('_', 'g'), '-');
                        body.groupId = body.artifactId.replace(new RegExp('-', 'g'), '').replace(new RegExp('_', 'g'), '');
                    }
                    body.configFileStale = true;
                    project.updateAttributes(body).success(function(proj){
                        callback(null, proj);
                    }).error(function(e){
                        winston.error('Project: project "' + project.name + '" update failed: ',e);
                        callback('error-updating-project');
                    });
                }else{
                    winston.error('Project: user "' + userId + '" attempted to access "' + project.name + '" but was not authorized');
                    callback('project-not-authorized');
                }
            }else{
                callback(e);
            }
        });
    }else{
        callback('invalid-body');
    }
};


// generate a project zip file
ProjectManager.prototype.getConfig = function(magnetId, callback){
    var me = this;
    me.read(magnetId, function(e, project){
        if(project){
            var filePath = me.projectDir+'/'+project.UserId+'/'+project.magnetId+'/'+project.artifactId+'.zip';
            if(project.configFileStale === true){
                project.getWSDLs().success(function(wsdls){
                    me.generateConfig(project, wsdls, function(e, filePath){
                        if(e){
                            winston.error('Project: failed to generate a config file for project "' + project.name + '": '+e);
                            callback(e);
                        }else{
                            project.updateAttributes({
                                configFileStale : false
                            }).success(function(){
                                callback(null, filePath);
                            }).error(function(e){
                                winston.error('Project: project "' + project.name + '" update failed: ' + e);
                                callback('error-updating-project');
                            });
                        }
                    });
                }).error(function(e){
                    winston.error('Project: could not retrieve wsdls for "' + project.name + '": ' + e);
                    callback('error-retrieving-wsdls');
                });
            }else{
                winston.log('Project: requested cached version of project config file for project "' + project.name + '"');
                callback(null, filePath, true);
            }
        }else{
            callback(e);
        }
    });
};

// generate a new project config file and return path to file
ProjectManager.prototype.generateConfig = function(project, wsdls, callback){
    var me = this, project = project || {}, wsdls = wsdls || {};
    me.renderConfig(project, wsdls, function(e, output){
        if(e){
            callback(e);
        }else{
            me.createProjectFolders(project.UserId, project.magnetId, function(e, path){
                if(e){
                    callback(e);
                }else{
                    me.createFile(path+'/'+project.artifactId+'.mapp', output, function(e, configFilePath){
                        if(e){
                            callback(e);
                        }else{
                            winston.log('Project: created config file: "'+project.artifactId+'.mapp" in "'+path+'"');
                            var apnsCertPath = path+'/'+project.apnsCertName;
                            if(!project.apnsCertName || project.apnsCertName.trim().length == 0) apnsCertPath = null;
                            me.createConfigZip(path, project.artifactId, configFilePath, apnsCertPath, function(zipPath){
                                callback(null, zipPath);
                            });
                        }
                    });
                }
            });
        }
    });
};

// create project configuration zip and return path
ProjectManager.prototype.createConfigZip = function(projectPath, filename, configFilePath, apnsCertPath, callback){
    var path = require('path'), targetPath = projectPath+'/'+filename+'.zip';
    var zip = new AdmZip();
    zip.addLocalFile(configFilePath);
    if(apnsCertPath && path.existsSync(apnsCertPath)){
        zip.addLocalFile(apnsCertPath);
    }
    zip.writeZip(targetPath);
    winston.log('Project: created config zip: "'+filename+'.zip"');
    callback(targetPath);
};

// create if not exist user and project folders
ProjectManager.prototype.createProjectFolders = function(userId, projectId, callback){
    var me = this;
    var path = me.projectDir;
    if(userId && projectId){
        me.createFolderIfNotExist(path, userId, function(e){
            if(e){
                callback(e);
            }else{
                path += '/'+userId;
                me.createFolderIfNotExist(path, projectId, function(e){
                    if(e){
                        callback(e);
                    }else{
                        path += '/'+projectId;
                        callback(null, path);
                    }
                });
            }
        });
    }else{
        winston.error('Project: failed to create user/project folders: invalid userId and/or projectId');
        callback('invalid-project');
    }
};

// render project config file
ProjectManager.prototype.renderConfig = function(project, wsdls, callback){
    if(typeof project !== typeof {} || !project.name || !project.description || !project.description){
        callback('invalid-project-object');
    }else{
        if(project.apnsCertName && project.apnsCertName.trim().length == 0){
            delete project.apnsCertName;
        }
        callback(null, ejs.render(fs.readFileSync(this.configTmplPath, 'ascii'), {
            settings : project,
            sysDBId  : project.artifactId+'_SysDB'+project.id,
            wsdls    : wsdls
        }));
    }
};

// create a folder if it doesnt exist
ProjectManager.prototype.createFolderIfNotExist = function(path, folder, callback){
    fs.mkdir(path+'/'+folder, function(e){
        if(!e || (e.code === 'EEXIST')){
            callback();
        }else{
            winston.error('Project: failed to create folder: ',e);
            callback('error-creating-folder');
        }
    });
};

// write a file given file path and input string
ProjectManager.prototype.createFile = function(filePath, str, callback){
    fs.writeFile(filePath, str, function(e){
        if(e){
            winston.error('Project: failed to write file "'+filePath+'": ',e);
            callback('error-creating-file');
        }else{
            callback(null, filePath);
        }
    });
};

// store an uploaded project file to file system
ProjectManager.prototype.storeProjectFile = function(magnetId, req, callback){
    var me = this;
    me.read(magnetId, function(e, project){
        if(project){
            me.createProjectFolders(project.UserId, project.magnetId, function(e, path){
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
                        project.updateAttributes({
                            configFileStale : true,
                            apnsCertName    : fileName
                        }).success(function(){
                            winston.log('Project: uploaded file: "'+fileName+'", type: "'+fileType+'" in "'+path+'"');
                            callback();
                        }).error(function(e){
                            winston.error('Project: project "' + project.name + '" update failed: ' + e);
                            callback('error-updating-project');
                        });
                    });
                    ws.on('error', function(e){
                        winston.log('Project: error uploading project file: '+e);
                        callback('error-uploading-file');
                    });

                }
            });
        }else{
            callback(e);
        }
    });
};

ProjectManager.prototype.setToStale = function(project, ProjectId){
    var err = 'project set to stale failed: ';
    if(Object.prototype.toString.call(project) == '[object Object]'){
        project.updateAttributes({
            configFileStale : true
        }).error(function(e){
            winston.error(err, e);
        });
    }else{
        orm.model('Project').find({
            where : {
                id : ProjectId
            }
        }).success(function(project){
            if(project){
                project.updateAttributes({
                    configFileStale : true
                }).error(function(e){
                    winston.error(err, e);
                });
            }else{
                winston.error(err + 'project with id: '+ProjectId+' not found');
            }
        }).error(function(e){
            winston.error(err + 'error attempting to find project with id: '+ProjectId);
        });
    }
}

// delete APNS certificate
ProjectManager.prototype.removeAPNSCertificate = function(magnetId, callback){
    var me = this;
    me.read(magnetId, function(e, project){
        if(project){
            var filePath = me.projectDir+'/'+project.UserId+'/'+project.magnetId+'/'+project.apnsCertName;
            fs.unlink(filePath, function(e){
                if(e){
                    winston.error('Project: failed to delete project file "'+project.apnsCertName+'": '+e);
                    callback('error-deleting-file');
                }else{
                    project.updateAttributes({
                        configFileStale : true,
                        apnsCertName    : ''
                    }).success(function(){
                        callback(null, filePath);
                    }).error(function(e){
                        winston.error('Project: project "' + project.name + '" update failed: ' + e);
                        callback('error-updating-project');
                    });
                }
            });
        }else{
            callback(e);
        }
    });
};

// add WSDL URL
ProjectManager.prototype.addWSDLUrl = function(projectMagnetId, userId, url, callback){
    var me = this;
    // check for a project matching the specified magnetId
    me.read(projectMagnetId, function(e, project){
        if(project){
            // validate whether the user owns this project, or the user is an admin
            if(project.UserId == userId){
                WSDLManager.saveWSDL(url, function(e, wsdl){
                    if(e){
                        callback(e);
                    }else{
                        project.addWSDL(wsdl).success(function(){
                            me.setToStale(project);
                            winston.log("Project: successfully add WSDL: " + url);
                            callback(null, wsdl);
                        }).error(function(e){
                            winston.error('Project: "' + project.magnetId + '" failed to add WSDL: ',e);
                            callback('add-wsdl-failed');
                        });
                    }
                });
            }else{
                winston.error('Project: "' + project.magnetId + '" attempted to access "' + project.name + '" but was not authorized');
                callback('not-authorized');
            }
        }else{
            callback(e);
        }
    });
};

// remove WSDL
ProjectManager.prototype.removeWSDLUrl = function(magnetId, callback){
    var me = this;
    // check for a WSDL matching the specified magnetId
    me.readWSDL(magnetId, function(e, wsdl){
        if(wsdl){
            me.setToStale(null, wsdl.ProjectId);
            wsdl.destroy().success(function(){
                winston.log("Project: successfully deleted WSDL: " + wsdl.url);
                callback(null, wsdl);
            }).error(function(e){
                winston.error('Project: user "' + req.session.user.email + '" failed to delete WSDL: ',e);
                callback('delete-wsdl-failed');
            });
        }else{
            callback(e);
        }
    });
};

ProjectManager.prototype.readWSDL = function(magnetId, callback){
    orm.model('WSDL').find({
        where : {
            magnetId : magnetId
        }
    }).success(function(wsdl){
        if(wsdl){
            callback(null, wsdl);
        }else{
            winston.error('WSDL: no WSDL was found with the given magnetId');
            callback('wsdl-not-found');
        }
    });
};


ProjectManager.prototype.getWSDLs = function(magnetId, callback){
    var me = this;
    me.read(magnetId, function(e, project){
        if(project){
            project.getWSDLs().success(function(wsdls){
                callback(null, wsdls);
            }).error(function(e){
                winston.error('Project: could not retrieve wsdls for "' + project.name + '": ' + e);
                callback('error-retrieving-wsdls');
            });
        }else{
            callback(e);
        }
    });
};

module.exports = new ProjectManager();