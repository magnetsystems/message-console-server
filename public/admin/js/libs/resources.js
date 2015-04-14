
/* HELPERS */

var GLOBAL = {};
var GlobalEventDispatcher = {};

var AJAX = function(loc, method, contentType, data, callback, failback, headers, params){
    params = params || {};
    var dataStr = (!$.isEmptyObject(data) && (contentType == 'application/json')) ? JSON.stringify(data) : data;
    if(method === 'POST' && dataStr === null) dataStr = '{}';
    $.support.cors = true;
    $.ajax({
        type        : method,
        url         : (loc.charAt(0) == '/' || params.redirectHost) ? loc : '/rest/'+loc,
        contentType : contentType,
        timeout     : params.timeout || 45000,
        data        : dataStr,
        beforeSend  : function(xhr){
            if(headers){
                $.each(headers, function(i , header){
                    xhr.setRequestHeader(header.name, header.val);
                });
            }
        }
    }).complete(function(xhr){
        if(xhr && xhr.responseText && xhr.responseText == 'restart-needed')
            GlobalEventDispatcher.generalEventPubSub.trigger('initRestart', params);
        if(params.btn)
            params.btn.html(params.btn.attr('txt')).removeClass('disabled');
    }).done(function(result, status, xhr){
        if(typeof callback === typeof Function)
            callback(result, status, xhr);
    }).fail(function(xhr, status, thrownError){
        if(xhr.status == 403 || xhr.status == 401){
            GLOBAL.referrer = window.location.hash;
            window.location.href = '/admin';
            GLOBAL.polling = false;
        }else if(typeof failback === typeof Function){
            var e = xhr.responseJSON ? xhr.responseJSON.message : xhr.responseText;
            failback(e, status, thrownError, xhr);
        }
    });
};

function pingHost(loc, cb, fb){
    var img = new Image();
    img.onload = cb;
    img.onerror = fb;
    img.src = loc+'/admin/images/ajax-loader-sm.gif';
}

// custom backbone sync function to use magnet entity model
function syncOverride(mc, eventPubSub){
    Backbone.sync = function(method, model, options){
        var qsStr = '', relationship = '', uModel = {}, relations = [];
        var url = model.urlRoot;
        var entity = url;
        if(model.attributes){
            // handle models
            var magnetId = model.attributes.magnetId;
            // build an entity object, removing empty properties and relationship properties
            if(model.data){
                if(model.data.relations){
                    relations = model.data.relations;
                }
            }
            $.each(model.attributes, function(key, val){ 
                if($.trim(val) != '' && key != 'profileName' & key != 'magnetId' && key != 'image'&& key != 'id' && key != 'dataUrl' && key != 'contentUrls' && key != 'formatTime' && key != 'formatCreatedTime' && key != 'formattedLatestAssetGeneratedTime' && $.inArray(key, relations) == -1){
                    uModel[key] = val;
                }
            });
        }else{
            // handle collections
        }
        // handle url parameters
        if(options.data){
            // get relationships using _magnet_relation url parameters
            if(!$.isEmptyObject(options.data.relations)){
                $.each(options.data.relations, function(i, relation){
                    qsStr += '&_magnet_relation='+relation;
                });
            }
            // get relationships using /{relationship} parameter
            if(!$.isEmptyObject(options.data.relationship)){
                relationship = options.data.relationship.name;
                var relId = options.data.relationship.magnetId || model.attributes.magnetId;
                magnetId = null;
                url += '/'+relId+'/'+relationship;
            }
            // for a complete un-RESTful hack
            if(options.data.magnetId){
                url += '/'+options.data.magnetId;
            }
            // retrieve next page of results using 
            if(options.data.nextPage && options.data.nextPage != ''){
                options.data.col = model;
                url = options.data.nextPage.slice(options.data.nextPage.lastIndexOf('_magnet_queries'));
            }
            // build magnet sort querystring
            if(!$.isEmptyObject(options.data.sorts)){
                $.each(options.data.sorts, function(key, val){
                    qsStr += '&'+(val == 'asc' ? '_magnet_ascending' : '_magnet_descending')+'='+key;
                });
            }
            // append selected page size
            if(options.data.pageSize){
                qsStr += '&_magnet_page_size='+options.data.pageSize;
            }
            // build magnet search querystring
            if(options.data.search){
                $.each(options.data.search, function(i, obj){
                    $.each(obj, function(key, val){
                        qsStr += '&'+key+'=%25'+val+'%25';
                    });
                });
            }
            // return specified entity properties only
            if(!$.isEmptyObject(options.data.selects)){
                $.each(options.data.selects, function(i, select){
                    qsStr += '&_magnet_select='+select;
                });
            }
            // build magnet current page querystring
            if(options.data.page && options.data.page != ''){
                qsStr += '&_magnet_page='+options.data.page;
            }
            // manually set max results
            if(options.data.maxResults){
                qsStr += '&_magnet_max_results='+options.data.maxResults;
            }
            model.data = options.data;
        }
        if(method === 'patch') method = 'update';
        switch(method){
            case 'read':
                mc.get(url, magnetId, qsStr, options.data, function(data, status, xhr){
                    if(typeof options.success === typeof Function){
                        options.success(data, status, xhr);
                    }
                }, function(xhr, ajaxOptions, thrownError){
                    if(typeof options.error === typeof Function){
                        options.error(xhr, ajaxOptions, thrownError);
                    }
                }, entity);
                break;
            case 'delete': 
                mc.remove(url, magnetId, function(data, status, xhr){
                    if(typeof options.success === typeof Function){
                        options.success(data, status, xhr);
                    }
                }, function(xhr, ajaxOptions, thrownError){
                    if(typeof options.error === typeof Function){
                        options.error(xhr, ajaxOptions, thrownError);
                    }
                });
                break;
            case 'update': 
                mc.update(url, magnetId, uModel, function(data, status, xhr){
                    if(typeof options.success === typeof Function){
                        options.success(data, status, xhr);
                    }
                }, function(xhr, ajaxOptions, thrownError){
                    if(typeof options.error === typeof Function){
                        options.error(xhr, ajaxOptions, thrownError);
                    }
                });
                break;
            case 'create':
                mc.create(url, uModel, function(data, status, xhr){
                    if(Object.prototype.toString.call(data) == '[object Object]'){
                        model.set({magnetId:data.magnetId, id:data.id});
                    }else{
                        model.set({magnetId:data, id:data});
                    }
                    if(typeof options.success === typeof Function){
                        options.success(model, status, xhr);
                    }
                }, function(xhr, ajaxOptions, thrownError){
                    if(typeof options.error === typeof Function){
                        options.error(xhr, ajaxOptions, thrownError);
                    }
                });
                break;
        }
    };
}
// magnet query class
function ModelConnector(httpreq){
    this.httpreq = httpreq;
    this.queries = {};
}
ModelConnector.prototype.get = function(path, id, qs, params, callback, failback, entity){
    var me = this;
    var selectAll = '';
    if(params){
        if(params.uriOnly || params.selects){
            selectAll = '';
        }
    }
    var url = path+(id != null ? '/'+id+(qs == '' ? '' : selectAll+qs) : selectAll+qs);
    // add a unique timestamp to prevent 304 Not Modified caching of dynamic data under IE only
    if(window.navigator.userAgent.indexOf('MSIE ') != -1){
        var timestamp = new Date().getTime();
        url += '&_magnet_body='+timestamp;
    }
    if(url.indexOf('?') == -1 && url.indexOf('&') != -1){
        url = url.replace('&', '?');
    }
    me.query(url, 'GET', {}, function(data, status, xhr){
        if(typeof callback === typeof Function){
            if(!me.chkSession(data, xhr)) return false;
            var result = {};
            if(data.paging){
                var models = [];
                // create pagination object
                var paging = {};
                paging.startIndex = data.start;
                paging.pageSize = data.paging.rpp;
                paging.totalSize = data.total;
                result = {
                    data   : data.rows,
                    paging : data.paging,
                    params : params || undefined
                };
            }else if(data instanceof Array){
                result = {
                    data   : data,
                    params : params || undefined
                };
            }else{
                result = data;
            }
            callback(result, status, utils.convertHeaderStrToObj(xhr));
        }
    }, undefined, undefined, function(xhr, ajaxOptions, thrownError){
        if(typeof failback === typeof Function){
            failback(xhr, ajaxOptions, thrownError);
        }
    });
}
ModelConnector.prototype.remove = function(path, id, callback, failback){
    var me = this;
    me.query(path+'/'+id, 'DELETE', {}, function(data, status, xhr){
        if(typeof callback === typeof Function){
            if(!me.chkSession(data, xhr)) return false;
            callback(data, status, utils.convertHeaderStrToObj(xhr));
        }
    }, undefined, undefined, function(xhr, ajaxOptions, thrownError){
        if(typeof failback === typeof Function){
            failback(xhr, ajaxOptions, thrownError);
        }
    });
}
ModelConnector.prototype.update = function(path, id, obj, callback, failback){
    var me = this;
    me.query(path+'/'+id, 'PUT', obj, function(data, status, xhr){
        if(typeof callback === typeof Function){
            if(!me.chkSession(data, xhr)) return false;
            callback(data, status, utils.convertHeaderStrToObj(xhr));
        }
    }, undefined, undefined, function(xhr, ajaxOptions, thrownError){
        if(typeof failback === typeof Function){
            failback(xhr, ajaxOptions, thrownError);
        }
    });
}
ModelConnector.prototype.create = function(path, obj, callback, failback){
    var me = this;
    me.query(path, 'POST', obj, function(data, status, xhr){
        if(typeof callback === typeof Function){
            if(!me.chkSession(data, xhr)) return false;
            callback(data, status, utils.convertHeaderStrToObj(xhr));
        }
    }, undefined, undefined, function(xhr, ajaxOptions, thrownError){
        if(typeof failback === typeof Function){
            failback(xhr, ajaxOptions, thrownError);
        }
    });
}
ModelConnector.prototype.query = function(uri, method, data, callback, returnType, contentType, failback, headers){
    var headerAry = [];
    if($.isArray(headers)){
        headerAry = headerAry.concat(headers);
    }
    this.httpreq.call(uri, method, returnType || 'json', contentType || 'application/json', data, function(result, status, xhr){
        if(typeof callback === typeof Function){
            callback(result, status, xhr);
        }
    }, function(xhr, ajaxOptions, thrownError){
        if(typeof failback === typeof Function){
            failback(xhr, ajaxOptions, thrownError);
        }
    }, headerAry);
}
// include magnetId into the relationship entity data
ModelConnector.prototype.appendIds = function(obj, params){
    if(!$.isEmptyObject(params)){
        if(params.relations){
            $.each(params.relations, function(i, relation){
                if($.isArray(obj[relation])){
                    $.each(obj[relation], function(j, entity){
                        entity.magnetId = entity['magnet-uri'].slice(entity['magnet-uri'].lastIndexOf('/')+1);
                    });
                }else if(typeof obj[relation] === 'object' && obj[relation] != null){
                    obj[relation].magnetId = obj[relation]['magnet-uri'].slice(obj[relation]['magnet-uri'].lastIndexOf('/')+1);
                }
            });
        }
    }
}
// redirect if user session expired
ModelConnector.prototype.chkSession = function(data, xhr){
    return true;
    if(typeof data !== 'object'){
        if(xhr.getResponseHeader('Content-Type') == 'text/html'){
            if(data.indexOf('Developer Factory : Login') != -1){
                Cookie.remove('magnet_auth');
                window.location.replace('/login/');
            }
        }
        return false;
    }
    return true;
}

// wrap jquery ajax function to reduce redundant code
function HTTPRequest(baseUrl){
    this.baseUrl = baseUrl;
}
HTTPRequest.prototype.call = function(loc, method, dataType, contentType, data, callback, failback, headers){
    var me = this;
    var dataStr = null;
    if(!$.isEmptyObject(data) && (contentType == 'application/json' || contentType == 'text/uri-list')){
        dataStr = JSON.stringify(data);
    }else{
        dataStr = data;
    }
    $.ajax({  
        type        : method,  
        url         : me.baseUrl+loc,  
        //dataType    : dataType,
        contentType : contentType,
        data        : dataStr,  
        beforeSend  : function(xhr){
            if(headers){
                $.each(headers, function(i , header){
                    xhr.setRequestHeader(header.name, header.val);
                });
            }
        }
    }).done(function(result, status, xhr){
        if(typeof callback === typeof Function){
            callback(result, status, xhr);
        }
    }).fail(function(xhr, status, thrownError){
        me.stats = {
            method : method,
            url    : me.baseUrl+loc,
            data   : dataStr,
            xhr    : xhr,
            status : status,
            error  : thrownError,
            loc    : window.location.href
        };
        // handle not authorized status codes to redirect to login page
        if(xhr.status == 403 || xhr.status == 401){
            Cookie.remove('magnet_auth');
            window.location.href = '/admin';
        }else if(typeof failback === typeof Function){
            failback(xhr, status, thrownError);
        }
    });
    return false;
}
// basic HTML5 upload component - Firefox, Google Chrome and Safari ONLY - not used
function uploader(id, url, property, type){
    var file = document.getElementById(id).files[0];
    uploadFile(file);
	function uploadFile(file){
        var reader = new FileReader();
        reader.onload = (function(theFile){
            return function(evt){
                AJAX(evt, file);
            };
        }(file));
        reader.readAsArrayBuffer(file);
	}
    function AJAX(evt, file){
		var xhr = new XMLHttpRequest();
		xhr.open("put", url+'/'+property, true);
        if(file.type != ''){
            type = file.type;
        }
		xhr.setRequestHeader("Content-Type", type);
        xhr.send(evt.target.result);
    }
}

var Cookie = {
    create : function(name, val, days){
        if(days){
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = '; expires=' + date.toGMTString();
        }else{
            var expires = '';
        }
        document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(val) + expires + '; path=/';
    },
    get : function(name){
        var nameEQ = encodeURIComponent(name) + '=';
        var ca = document.cookie.split(';');
        for(var i=0;i<ca.length;i++){
            var c = ca[i];
            while(c.charAt(0) == ' '){
                c = c.substring(1, c.length)
            };
            if(c.indexOf(nameEQ) == 0){
                return decodeURIComponent(c.substring(nameEQ.length, c.length))
            }
        }
        return null;
    },
    remove : function(name){
        this.create(name, "", -1);
    }
}

function startLoading(id){
    $('#'+id+' .modal-footer').hide();
    $('#'+id+' .loading.modal-footer').show();
}
function endLoading(id, params){
    $('#'+id+' .modal-footer').show();
    $('#'+id+' .loading.modal-footer').hide();
    if(params){
        $('#'+id+' h4').html(params.title);
        $('#'+id+' .form-horizontal').hide();
        $('#'+id+' .subheading').html(params.text);
    }
}
// validate and display error messages prior to form submission
function Validator(domId){
    this.domId = domId;
}
Validator.prototype.showError = function(t, m){
    $('#'+this.domId+' .modal_errors strong').text(t+': ');
    $('#'+this.domId+' .modal_errors span').text(m);
    $('#'+this.domId+' .modal_errors').hide().slideDown('fast');
}
Validator.prototype.validateUserInvitation = function(){
    var me = this;
    var valid = true;
    var emailRxp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    if(!emailRxp.test($('#invite-other-modal input[name="email"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
    return valid;
}
// object to handle friend invitation process
function FriendInvitation(){
    var me = this;
    me.domId = 'invite-other-modal';
    me.validator = new Validator(me.domId);
    $('#invite-others').click(function(e){
        e.preventDefault();
        $('#invite-other-modal').modal('show');
        $('#'+me.domId+' input[name="user-invite-email"]').focus();
    });
    $('#'+me.domId+' .btn-primary').click(function(){
        me.invite();
    });
    $('#'+me.domId+' input').keypress(function(e){
        if(e.keyCode == 13){
            me.invite();
        }
    });
}
FriendInvitation.prototype.invite = function(){
    var me = this;
    me.info = {};
    $('#'+me.domId+' input, #'+me.domId+' textarea').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(me.validator.validateUserInvitation()){
        me.call();
    }
}
FriendInvitation.prototype.call = function(){
    $('.modal_errors').hide();
    var me = this;
    me.info.invitor = me.uri;
    startLoading(me.domId);
    $.ajax({
        type        : 'POST',
        url         : '/rest/userInviteUser',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : me.info
    }).done(function(data, status, xhr){
        endLoading(me.domId);
        $('#'+me.domId+' input').val('');
        $('#'+me.domId+' textarea').val('I found this great new tool to quickly create mobile apps for me.');
        $('#'+me.domId+' .modal_success').show('fast', function(){
            var display = $(this);
            setTimeout(function(){
                display.hide('slow');
            }, 5000);
        });
        $('#'+me.domId+' .modal_errors').hide();
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'A server error occurred during the invitation process. Please try again later.';
        if(xhr.status == 500){
            var res = tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message;
            }
        }
        me.validator.showError('User Invitation Failure', msg);
    });
}

// utility functions
timer = {
    loops : {},
    poll : function(action, delay, id){
        var me = this;
        //$(id).show();
        me.loops[id] = me.loops[id] || {};
        me.interval(action, delay, id);
        me.loops[id].timer = setInterval(function(){
            if(!me.loops[id].paused){
                me.interval(action, delay, id);
            }
        }, delay+1000);
    },
    interval : function(action, delay, id){
        var me = this;
        var cls = id.replace('#', '');
        ctr = (delay/1000) - 1;
        clearInterval(me.loops[id].ctr);
        me.loops[id].paused = true;
        action(me.loops[id]);
        me.loops[id].ctr = setInterval(function(){
            var html = 'refreshing content in ';
            var min = Math.floor(ctr/60);
            var sec = ctr-min*60;
            if(min > 0){
                html += min+' minutes and ';
            }
            //html += sec+' seconds <button class="btn '+cls+'">Refresh</button>';
            html = 'Processing...';
            $(id).html(html);
            /*
            $('.'+cls).click(function(){
                $(id).html('Refreshing <img src="../images/ajax-loader-sm.gif" />');
                me.stop(id);
                me.poll(action, delay, id);
            });
            */
            ctr -= 1;
            if(ctr < 0){
                $(id).html('Processing... <img src="/images/ajax-loader-sm.gif" />');
            }
        }, 1000);
    },
    stop : function(id){
        if(!id){
            $.each(this.loops, function(i, loop){
                clearInterval(loop.timer);
                clearInterval(loop.ctr);
            });
        }else{
            if(this.loops[id]){
                clearInterval(this.loops[id].timer);
                clearInterval(this.loops[id].ctr);
                //$(id).hide();
            }
        }
    }
}

function SessionManager(){
    this.sessionLength = 20;
    this.timestamp = this.getTimestamp();
    this.timers = [
        {time : 2},
        {time : 1},
        {time : 0}
    ];
    Cookie.create('session_timestamp', this.timestamp, 1);
    this.reset();
}
SessionManager.prototype.reset = function(){
    for(var i=this.timers.length;i--;){
        clearTimeout(this.timers[i].timer);
        this.set(this.timers[i]);
    }
}
SessionManager.prototype.set = function(timer){
    var me = this;
    timer.timer = setTimeout(function(){
        me.confirm(timer.time);
    }, (me.sessionLength-timer.time) * 60 * 1000);
}
SessionManager.prototype.confirm = function(time){
    var me = this;
    var timestamp = Cookie.get('session_timestamp');
    if(timestamp && timestamp != me.timestamp){
        me.timestamp = timestamp;
        $('.modal').modal('hide');
        me.reset();
        return false;
    }
    if(time == 0){
        $('.modal').modal('hide');
        Cookie.remove('session_timestamp');
        Cookie.remove('magnet_auth');
        window.location.href = '/admin';
    }else{
        Alerts.Confirm.display({
            title   : 'Session Timeout Soon',
            content : 'Your session is timing out in '+time+' minutes. Would you like to refresh your session?'
        }, function(){
            me.getBeacon();
            me.timestamp = me.getTimestamp();
            Cookie.create('session_timestamp', me.timestamp, 1);
        });
    }
}
SessionManager.prototype.getBeacon = function(){
    $.ajax({
        type  : 'GET',
        url   : '/admin/beacon.json',
        cache : false
    });
}
SessionManager.prototype.getTimestamp = function(){
    return Math.round(+new Date()/1000);
}

utils = {
    isCanvasSupported : function(){
        var elem = document.createElement('canvas');
        return !!(elem.getContext && elem.getContext('2d'));
    },
    magnetId : function(str){
        return str.slice(str.lastIndexOf('/')+1);
    },
    cleanName : function(str){
        return str.replace(new RegExp(' ', 'g'), '').replace(new RegExp('-', 'g'), '').replace(new RegExp('_', 'g'), '');
    },
    baseUrl : window.location.href.replace(window.location.hash, '').substr(0, window.location.href.replace(window.location.hash, '').lastIndexOf('/')),
    txtDefaults : function(sel){
        $(sel).focus(function(){
            if(this.value == this.defaultValue){
                this.value = '';
                $(this).css('color', '#000');
            }
        }).blur(function(){
            if(this.value == ''){
                this.value = this.defaultValue;
                $(this).css('color', '#555');
            }
        })
    },
    setIndexOf : function(){
        if(!Array.prototype.indexOf){
            Array.prototype.indexOf = function(elt /*, from*/){
                var len = this.length >>> 0;
                var from = Number(arguments[1]) || 0;
                from = (from < 0) ? Math.ceil(from) : Math.floor(from);
                if(from < 0){
                    from += len;
                }
                for(; from < len; from++){
                    if(from in this && this[from] === elt){
                        return from;
                    }
                }
                return -1;
            };
        }
    },
    getValidJSON : function(str){
        try{
            return JSON.parse(str);
        }catch(e){
            return false;
        }
    },
    convertHeaderStrToObj : function(xhr){
        var dataObj = {};
        $.each(xhr, function(i, val){
            if(($.type(val) == 'string' || $.type(val) == 'number')  && i != 'responseText'){
                dataObj[i] = val;
            }
        });
        $.each(xhr.getAllResponseHeaders().split('\n'), function(i, line){
            var ary = $.trim(line).split(': ');
            if(ary.length > 1){
                dataObj[ary[0]] = ary[1];
            }
        });
        return dataObj;
    },
    hasAllOptionalProperties : function(properties, prefix, total){
        var ctr = 0;
        $.each(properties, function(prop, val){
            if(prop.indexOf(prefix) != -1 && val != ''){
                ++ctr;
            }
        });
        return ctr == total;
    },
    cleanJavaKeywords: function(str){
        var renamed = str.toLowerCase();
        var keywords = ['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','final','finally','float','for','goto','if','implements','import','instanceof','int','interface','long','native','new','package','private','protected','public','return','short','static ','strictfp','super','switch','synchronized','this','throw','throws','transient','try','void','volatile','while'];
        for(var i=keywords.length;i--;){
            if(keywords[i] == renamed){
                str += ' project';
            }
        }
        return str;
    },
    resetError: function(form){
        form.find('.has-error').removeClass('has-error');
        form.find('.alert-container').html('');
    },
    showError: function(dom, name, error){
        dom.find('input[name="'+name+'"]').closest('div').addClass('has-error');
        var alert = $('<div class="alert alert-danger" role="alert"><strong>Error</strong> '+error+'</div>');
        dom.find('.alert-container:first').html(alert);
        setTimeout(function(){
            alert.fadeOut('slow', function(){
                alert.remove();
            });
        }, 5000);
    },
    // collect project details from form fields into data object
    collect : function(dom, looseBooleans, skipEmptyStrings, convertNumericStrings){
        var obj = {}, me = this;
        dom.find('.btn-group:not(.disabled)').each(function(){
            if($(this).hasClass('pillbox-input-wrap')) return;
            obj[$(this).attr('did')] = $(this).find('button.btn-primary').attr('did');
        });
        dom.find('input[type="radio"]:checked').each(function(){
            var name = $(this).attr('name');
            if(name.indexOf('authMethod') != -1){
                name = name.substr(0, name.indexOf('-'));
            }
            obj[name] = $(this).val();
        });
        dom.find('input[type="text"], select, input[type="password"], input[type="hidden"], textarea').each(function(){
            var val = $(this).val();
            if(typeof $(this).attr('name') != 'undefined' && $(this).attr('name').length){
                if($(this).attr('name') && $(this).attr('name').indexOf('Port') != -1 && $.trim(val).length == 0){
                    val = 0;
                }
                obj[$(this).attr('name')] = val;
            }
        });
        dom.find('.pill-group > .pill > span:first-child').each(function(){
            var did = $(this).closest('.pillbox').attr('name');
            obj[did] = obj[did] || [];
            obj[did].push($(this).text());
        });
        $.each(obj, function(name, val){
            if(!looseBooleans){
                if(val === 'true'){
                    obj[name] = true;
                }
                if(val === 'false'){
                    obj[name] = false;
                }
            }
            if(convertNumericStrings && obj[name] && $.trim(obj[name]) !== '' && me.isNumeric(obj[name])){
                obj[name] = parseInt(obj[name]);
            }
            if(skipEmptyStrings){
                if(obj[name] === '' || obj[name] === null)
                    delete obj[name];
            }
        });
        return obj;
    },
    pushNode : function(obj, name, val){
        if(!obj['_node']) return false;
        obj['_node'].push({
            "magnet-type" : "property-node",
            "key"       : name,
            "value"     : val
        });
    },
    // remove an item from associative array given a property name
    removeByProp : function(ary, prop, val){
        for(var i=ary.length;i--;){
            if(ary[i][prop] == val){
                ary.splice(i, 1);
            }
        }
    },
    ISO8601ToDT: function(str, isNow){
        try{
            var date = isNow ? new Date() : new Date(str);
            if(isNaN(date)){
                date = this.fromISO8601(str);
            }
            var yyyy = date.getFullYear();
            var mm = this.formatDT(date.getMonth()+1);
            var dd = this.formatDT(date.getDate());
            var hh = this.formatDT(date.getHours());
            var m = this.formatDT(date.getMinutes());
            var ss = this.formatDT(date.getSeconds());
            return mm+'-'+dd+'-'+yyyy+' '+hh+':'+m+':'+ss;
        }catch(e){
            return '';
        }
    },
    isSequelizeDate: function(str){
        return str.match(/^[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9]/i);
    },
    formatDT: function(str){
        return str < 10 ? '0'+str : str;
    },
    fromISO8601: function(s){
        var re = /(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(\.\d+)?(Z|([+-])(\d\d):(\d\d))/;
        var d = [];
        d = s.match(re);
        if(!d){
            throw "Couldn't parse ISO 8601 date string '" + s + "'";
        }
        var a = [1,2,3,4,5,6,10,11];
        for(var i in a){
            d[a[i]] = parseInt(d[a[i]], 10);
        }
        d[7] = parseFloat(d[7]);
        var ms = Date.UTC(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
        if(d[7] > 0){  
            ms += Math.round(d[7] * 1000);
        }
        if(d[8] != "Z" && d[10]){
            var offset = d[10] * 60 * 60 * 1000;
            if(d[11]){
                offset += d[11] * 60 * 1000;
            }
            if(d[9] == "-"){
                ms -= offset;
            }else{
                ms += offset;
            }
        }
        return new Date(ms);
    },
    toISO8601 : function(d){
        function pad(n){return n<10 ? '0'+n : n}
        return d.getUTCFullYear()+'-'
          + pad(d.getUTCMonth()+1)+'-'
          + pad(d.getUTCDate())+'T'
          + pad(d.getUTCHours())+':'
          + pad(d.getUTCMinutes())+':'
          + pad(d.getUTCSeconds())+'Z';
    },
    isNumeric : function(n){
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    // returns whether current browser is an iOS device
    isIOS : function(){
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    },
    isValidEmail: function(e){
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(e);
    },
    isValidHost: function(str){
        str = str.replace('http://', '').replace('https://', '');
        str = str.substr(0, (str.indexOf(':') === -1 ? str.length : str.indexOf(':')));
        return /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(str);
    },
    sqlToObject: function(str){
        var a = str.match(/mysql:\/\/[^;]*\?/i), b = {};
        if(a){
            a = a[0].replace('mysql:\/\/', '').replace('?', '');
            a = a.split('/');
            b.dbName = a[1];
            a = a[0].split(':');
            b.host = a[0];
            b.port = a[1];
        }
        return b;
    },
    getIndexByAttr: function(ary, key, val){
        var index;
        for(var i=0;i<ary.length;++i){
            if(ary[i][key] === val || ary[i][key] === parseInt(val)){
                index = i;
            }
        }
        return index;
    },
    removeByAttr: function(ary, key, val){
        for(var i=0;i<ary.length;++i){
            if(ary[i][key] === val){
                ary.splice(i, 1);
            }
        }
        return ary;
    },
    resetRows: function(repeater){
        repeater.find('input[type="checkbox"]').attr('checked', false);
        repeater.find('.repeater-header .glyphicon.disableable').addClass('disabled');
        repeater.find('.repeater-header .fa.disableable').addClass('disabled');
    },
    toggleRow: function(view, checkbox, type, property){
        var parent = checkbox.closest('tbody');
        var row = checkbox.closest('tr');
        var list = parent.closest('.repeater');
        var id = row.attr('did');
        parent.find('tr[did!="'+id+'"] input[type="checkbox"]').attr('checked', false);
        if(checkbox.is(':checked')){
            view.selectedElements = [];
            view.selectedElements.push(utils.getByAttr(view[type], property, id)[0]);
        }else{
            view.selectedElements.splice(utils.getIndexByAttr(view.selectedElements, property, id), 1);
        }
        utils.toggleActions(view.selectedElements, list);
    },
    toggleActions: function(selectedElements, list){
        if(selectedElements.length){
            list.find('.repeater-header .glyphicon.disableable').removeClass('disabled');
            list.find('.repeater-header .fa.disableable').removeClass('disabled');
            if(selectedElements.length > 1){

            }
        }else{
            list.find('.repeater-header .glyphicon.disableable').addClass('disabled');
            list.find('.repeater-header .fa.disableable').addClass('disabled');
        }
    },
    formatTableHeader: function(parent, len){
        setTimeout(function(){
            var el = parent.find('.repeater-list-header tr').addClass('head').detach();
            if(len){
                el.prependTo(parent.find('.repeater-list-items tbody'));
                parent.find('.repeater-list-items tr td:nth-child(1)').css('width', '30px');
            }
        }, 20);
    },
    changeSearchBy: function(me, val){
        if(me.filters[val]){
            var filter = me.filters[val];
            me.$el.find('.searchby-input-container').html(_.template($('#ADV'+filter.type+'Filter').html(), {
                filter : filter,
                name   : val
            }));
        }else{
            me.$el.find('.searchby-input-container').html('');
        }
    },
    collectFilters: function(dom){
        var me = this, ary = [];
        dom.find('.advsearch-filter-item').each(function(){
            var val = me.collect($(this));
            ary.push({
                name : $(this).attr('did'),
                val  : (val.enum || val.search) ? (val.enum || val.search) : val
            });
        });
        return ary;
    },
    detectIE: function(){
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf('MSIE ');
        if (msie > 0) return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        var trident = ua.indexOf('Trident/');
        var rv = ua.indexOf('rv:');
        if(trident > 0) return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        var edge = ua.indexOf('Edge/');
        if(edge > 0) return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
        return false;
    }
};


var validator = {
    minMap: {
        facebookEnabled: {
            expected : true,
            text     : 'Facebook',
            contains : 'fbClient',
            min      : 2
        },
        linkedinEnabled: {
            expected : true,
            text     : 'LinkedIn',
            contains : 'liClient',
            min      : 2
        },
        salesforceEnabled: {
            expected : true,
            text     : 'Salesforce',
            contains : 'sfdcClient',
            min      : 3
        },
        emailEnabled : {
            expected : true,
            text     : 'Email',
            contains : 'smtp',
            min      : 6
        },
        apnsEnabled: {
            expected : true,
            text     : 'APNS',
            contains : 'apns',
            min      : 3
        },
        gcmEnabled: {
            expected : true,
            text     : 'GCM',
            contains : 'gcm',
            min      : 3
        },
        jdbcAppEnabled : {
            expected : true,
            text     : 'MySQL App DB',
            contains : 'jdbcApp',
            min      : 4
        }
    },
    isInvalid: function(properties, additions){
        var me = this, ary = additions || [];
        $.each(me.minMap, function(key, obj){
            if(properties[key] && properties[key] == obj.expected){
                if(!utils.hasAllOptionalProperties(properties, obj.contains, obj.min)){
                    ary.push(obj.text);
                }
            }
        });
        return ary.length != 0 ? {
            text : this.getText(ary),
            ary  : ary
        } : false;
    },
    getText: function(ary){
        if(ary.length != 0){
            var text = '';
            if(ary.length == 1){
                text = ary.join('');
            }else if(ary.length == 2){
                text = ary.join(' and ');
            }else if(ary.length > 2){
                text = ary.join(', ');
                var pos = text.lastIndexOf(',');
                text = text.substring(0, pos) + ', and' + text.substring(pos + 1);
            }
        }
        return text || false;
    }
};


function initDatagrid(){
    $.fn.repeater.views.datagrid = {
        dataOptions: function( opts, callback ) {
            if ( this.list_sortDirection ) {
                opts.sortDirection = this.list_sortDirection;
            }
            if ( this.list_sortProperty ) {
                opts.sortProperty = this.list_sortProperty;
            }
            callback( opts );
        },
        initialize: function( helpers, callback ) {
            this.list_sortDirection = null;
            this.list_sortProperty = null;
            callback();
        },
        selected: function( helpers, callback ) {
            var infScroll = this.options.list_infiniteScroll;
            var opts;

            this.list_firstRender = true;
            this.$loader.addClass( 'noHeader' );

            if ( infScroll ) {
                opts = ( typeof infScroll === 'object' ) ? infScroll : {};
                this.infiniteScrolling( true, opts );
            }

            callback( {} );
        },
        renderer: {
            complete: function( helpers, callback ) {
                columnSyncing.call( this, helpers, callback );
            },
            nested: [ {
                complete: function( helpers, callback ) {
                    var auto = [];
                    var self = this;
                    var i, l, newWidth, taken;

                    if ( !this.options.list_columnSizing || this.list_columnsSame ) {
                        callback();
                    } else {
                        i = 0;
                        taken = 0;
                        helpers.item.find( 'td' ).each( function() {
                            var $col = $( this );
                            var isLast = ( $col.next( 'td' ).length === 0 ) ? true : false;
                            var width;
                            if ( self.list_columns[ i ].width !== undefined ) {
                                width = self.list_columns[ i ].width;
                                $col.outerWidth( width );
                                taken += $col.outerWidth();
                                if ( !isLast ) {
                                    self.list_columns[ i ]._auto_width = width;
                                } else {
                                    $col.outerWidth( '' );
                                }
                            } else {
                                auto.push( {
                                    col: $col,
                                    index: i,
                                    last: isLast
                                } );
                            }
                            i++;
                        } );

                        l = auto.length;
                        if ( l > 0 ) {
                            newWidth = Math.floor( ( this.$canvas.width() - taken ) / l );
                            for ( i = 0; i < l; i++ ) {
                                if ( !auto[ i ].last ) {
                                    auto[ i ].col.outerWidth( newWidth );
                                    this.list_columns[ auto[ i ].index ]._auto_width = newWidth;
                                }
                            }
                        }
                        callback();
                    }
                },
                render: function( helpers, callback ) {
                    var differentColumns = function( oldCols, newCols ) {
                        var i, j, l;
                        if ( !oldCols ) {
                            return true;
                        }
                        if ( !newCols ) {
                            return false;
                        }
                        for ( i = 0, l = newCols.length; i < l; i++ ) {
                            if ( !oldCols[ i ] ) {
                                return true;
                            } else {
                                for ( j in newCols[ i ] ) {
                                    if ( oldCols[ i ][ j ] !== newCols[ i ][ j ] ) {
                                        return true;
                                    }
                                }
                            }
                        }
                        return false;
                    };

                    if (1 === 1 || this.list_firstRender || differentColumns( this.list_columns, helpers.data.columns ) ) {
                        this.$element.find( '.repeater-list-header' ).remove();
                        this.list_columns = helpers.data.columns;
                        this.list_columnsSame = false;
                        this.list_firstRender = false;
                        this.$loader.removeClass( 'noHeader' );
                        callback( {
                            action: 'prepend',
                            item: '<table class="table repeater-list-header" data-preserve="deep" role="grid" aria-readonly="true"><tr data-container="true"></tr></table>'
                        } );
                    } else {
                        this.list_columnsSame = true;
                        callback( {
                            skipNested: true
                        } );
                    }
                },
                nested: [ {
                    render: function( helpers, callback ) {
                        var chev = 'glyphicon-chevron';
                        var chevDown = chev + '-down';
                        var chevUp = chev + '-up';
                        var index = helpers.index;
                        var self = this;
                        var subset = helpers.subset;
                        var cssClass, $item, sortable, $span;

                        cssClass = subset[ index ].cssClass;
                        $item = $( '<td><span class="glyphicon"></span></td>' );
                        $item.addClass( ( ( cssClass !== undefined ) ? cssClass : '' ) ).prepend( subset[ index ].label );
                        $span = $item.find( 'span.glyphicon:first' );

                        sortable = subset[ index ].sortable;
                        if ( sortable ) {
                            $item.addClass( 'sortable' );
                            $item.on( 'click.fu.repeater-list', function() {
                                self.list_sortProperty = ( typeof sortable === 'string' ) ? sortable : subset[ index ].property;
                                if ( $item.hasClass( 'sorted' ) ) {
                                    if ( $span.hasClass( chevUp ) ) {
                                        $span.removeClass( chevUp ).addClass( chevDown );
                                        self.list_sortDirection = 'desc';
                                    } else {
                                        if ( !self.options.list_sortClearing ) {
                                            $span.removeClass( chevDown ).addClass( chevUp );
                                            self.list_sortDirection = 'asc';
                                        } else {
                                            $item.removeClass( 'sorted' );
                                            $span.removeClass( chevDown );
                                            self.list_sortDirection = null;
                                            self.list_sortProperty = null;
                                        }
                                    }
                                } else {
                                    helpers.container.find( 'td' ).removeClass( 'sorted' );
                                    $span.removeClass( chevDown ).addClass( chevUp );
                                    self.list_sortDirection = 'asc';
                                    $(this).addClass( 'sorted' );
                                }
                                self.render( {
                                    clearInfinite: true,
                                    pageIncrement: null
                                } );
                            } );
                        }
                        if ( subset[ index ].sortDirection === 'asc' || subset[ index ].sortDirection === 'desc' ) {
                            helpers.container.find( 'td' ).removeClass( 'sorted' );
                            $item.addClass( 'sortable sorted' );
                            if ( subset[ index ].sortDirection === 'asc' ) {
                                $span.addClass( chevUp );
                                this.list_sortDirection = 'asc';
                            } else {
                                $span.addClass( chevDown );
                                this.list_sortDirection = 'desc';
                            }
                            this.list_sortProperty = ( typeof sortable === 'string' ) ? sortable : subset[ index ].property;
                        }

                        callback( {
                            item: $item
                        } );
                    },
                    repeat: 'data.columns'
                } ]
            }, {
                after: function( helpers, callback ) {
                    var canvas = this.$canvas;
                    var header = canvas.find( '.repeater-list-header' );
                    if ( this.staticHeight ) {
                        helpers.item.height( canvas.height() - header.outerHeight() );
                    }
                    callback();
                },
                render: function( helpers, callback ) {
                    var $item = this.$canvas.find( '.repeater-list-wrapper' );
                    var obj = {};
                    var $empty;
                    if ( $item.length > 0 ) {
                        obj.action = 'none';
                    } else {
                        $item = $( '<div class="repeater-list-wrapper" data-infinite="true"><table class="table repeater-list-items" data-container="true" role="grid" aria-readonly="true"></table></div>' );
                    }
                    obj.item = $item;
                    if ( helpers.data.items.length < 1 ) {
                        obj.skipNested = true;
                        $empty = $( '<tr class="empty"><td></td></tr>' );
                        $empty.find( 'td' ).append( this.options.list_noItemsHTML );
                        $item.find( '.repeater-list-items' ).append( $empty );
                    } else {
                        $item.find( '.repeater-list-items tr.empty:first' ).remove();
                    }
                    callback( obj );
                },
                nested: [ {
                    complete: function( helpers, callback ) {
                        var obj = {
                            container: helpers.container
                        };
                        if ( helpers.item !== undefined ) {
                            obj.item = helpers.item;
                        }
                        if ( this.options.list_rowRendered ) {
                            this.options.list_rowRendered( obj, function() {
                                callback();
                            } );
                        } else {
                            callback();
                        }
                    },
                    render: function( helpers, callback ) {
                        var $item = $( '<tr data-container="true" did="'+helpers.subset[ helpers.index ].id+'"></tr>' );
                        var self = this;

                        if ( this.options.list_selectable ) {
                            $item.addClass( 'selectable' );
                            $item.attr( 'tabindex', 0 ); // allow items to be tabbed to / focused on
                            $item.data( 'item_data', helpers.subset[ helpers.index ] );
                            $item.on( 'click.fu.repeater-list', function() {
                                var $row = $( this );
                                if ( $row.hasClass( 'selected' ) ) {
                                    $row.removeClass( 'selected' );
                                    $row.find( '.repeater-list-check' ).remove();
                                    self.$element.trigger( 'itemDeselected.fu.repeater', $row );
                                } else {
                                    if ( self.options.list_selectable !== 'multi' ) {
                                        self.$canvas.find( '.repeater-list-check' ).remove();
                                        self.$canvas.find( '.repeater-list-items tr.selected' ).each( function() {
                                            $( this ).removeClass( 'selected' );
                                            self.$element.trigger( 'itemDeselected.fu.repeater', $( this ) );
                                        } );
                                    }
                                    $row.addClass( 'selected' );
                                    $row.find( 'td:first' ).prepend( '<div class="repeater-list-check"><span class="glyphicon glyphicon-ok"></span></div>' );
                                    self.$element.trigger( 'itemSelected.fu.repeater', $row );
                                }
                            } );
                            // allow selection via enter key
                            $item.keyup( function( e ) {
                                if ( e.keyCode === 13 ) {
                                    $item.trigger( 'click.fu.repeater-list' );
                                }
                            } );
                        }

                        this.list_curRowIndex = helpers.index;
                        callback( {
                            item: $item
                        } );
                    },
                    repeat: 'data.items',
                    nested: [ {
                        after: function( helpers, callback ) {
                            var obj = {
                                container: helpers.container
                            };
                            if ( helpers.item !== undefined ) {
                                obj.item = helpers.item;
                            }
                            if ( this.options.list_columnRendered ) {
                                this.options.list_columnRendered( obj, function() {
                                    callback();
                                } );
                            } else {
                                callback();
                            }
                        },
                        render: function( helpers, callback ) {
                            var cssClass = helpers.subset[ helpers.index ].cssClass;
                            var content = helpers.data.items[ this.list_curRowIndex ][ helpers.subset[ helpers.index ].property ];
                            if(Object.prototype.toString.call(content) === '[object Array]')
                                content = content.join(', ');
                            var $item = $( '<td></td>' );
                            if(helpers.subset[ helpers.index ].property == 'manage')
                                $item = $('<td><div class="fixed-160 controls hoverable"><button type="button" did="edit" class="btn btn-primary btn-sm"><span class="glyphicon glyphicon-edit"></span><span class="hidden-xs">Edit</span></button><button type="button" did="remove" class="btn btn-primary btn-sm"><span class="glyphicon glyphicon-trash"></span><span class="hidden-xs">Remove</span></button></div></td>');
                            if(content && helpers.subset[ helpers.index ].property == 'dataRefId'){
                                $item = $( '<td><button class="view-log-data btn btn-primary btn-sm" did="'+content+'">View</button><button class="download-log-data btn btn-primary btn-sm" did="'+content+'">Download</button></td>' );
                                content = '';
                            }
                            if(helpers.subset[ helpers.index ].property == 'toggle')
                                $item = $('<td width="1"><span class="glyphicon glyphicon-plus"></span></td>');
                            if(helpers.subset[ helpers.index ].property == 'sendmessage')
                                $item = $('<td width="1"><button btype="user" class="sendmessage btn btn-sm btn-primary">Send</td>');
                            var width = helpers.subset[ helpers.index ]._auto_width;

                            $item.addClass( ( ( cssClass !== undefined ) ? cssClass : '' ) ).append( content );
                            if ( width !== undefined ) {
                                $item.outerWidth( width );
                            }
                            callback( {
                                item: $item
                            } );
                        },
                        repeat: 'this.list_columns'
                    } ]
                } ]
            } ]
        },
        resize: function( helpers, callback ) {
            columnSyncing.call( this, {
                data: {
                    items: [ '' ]
                }
            }, callback );
        }
    };
    var columnSyncing = function( helpers, callback ) {
        var i = 0;
        var widths = [];
        var $header, $items;

        if ( !this.options.list_columnSyncing || ( helpers.data.items.length < 1 ) ) {
            callback();
        } else {
            $header = this.$element.find( '.repeater-list-header:first' );
            $items = this.$element.find( '.repeater-list-items:first' );
            $items.find( 'tr:first td' ).each( function() {
                widths.push( $( this ).outerWidth() );
            } );
            widths.pop();
            $header.find( 'td' ).each( function() {
                if ( widths[ i ] !== undefined ) {
                    $( this ).outerWidth( widths[ i ] );
                }
                i++;
            } );
            callback();
        }
    };
}