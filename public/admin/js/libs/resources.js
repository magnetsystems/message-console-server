
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
            Backbone.history.navigate('/');
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
                this.httpreq.cookies.remove('magnet_auth');
                window.location.replace('/login/');
            }
        }
        return false;
    }
    return true;
}

// wrap jquery ajax function to reduce redundant code
function HTTPRequest(baseUrl, cookies){
    this.cookies = cookies;
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
            me.cookies.remove('magnet_auth');
            window.location.replace('/login/');
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
// cookies
function Cookie(){}
Cookie.prototype.create = function(name, val, days){
    if(days){
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = '; expires=' + date.toGMTString();
    }else{
        var expires = '';
    }
    document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(val) + expires + '; path=/';
}
Cookie.prototype.get = function(name){
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
}
Cookie.prototype.remove = function(name){
    this.create(name, "", -1);
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

function SessionManager(cookies){
    this.sessionLength = 20;
    this.timestamp = this.getTimestamp();
    this.timers = [
        {time : 2},
        {time : 1},
        {time : 0}
    ];
    this.cookies = cookies;
    this.cookies.create('session_timestamp', this.timestamp, 1);
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
    var timestamp = me.cookies.get('session_timestamp');
    if(timestamp && timestamp != me.timestamp){
        me.timestamp = timestamp;
        $('.modal').modal('hide');
        me.reset();
        return false;
    }
    if(time == 0){
        $('.modal').modal('hide');
        me.cookies.remove('session_timestamp');
        me.cookies.remove('magnet_auth');
        window.location.replace('/logout');
    }else{
        Alerts.Confirm.display({
            title   : 'Session Timeout Soon',
            content : 'Your session is timing out in '+time+' minutes. Would you like to refresh your session?'
        }, function(){
            me.getBeacon();
            me.timestamp = me.getTimestamp();
            me.cookies.create('session_timestamp', me.timestamp, 1);
        });
    }
}
SessionManager.prototype.getBeacon = function(){
    $.ajax({
        type  : 'GET',
        url   : '/beacon.json',
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
        form.find('.col-sm-12, .col-sm-10, .col-sm-8, .col-sm-6, .col-sm-4, .col-md-3, .col-md-4, .col-md-6').removeClass('has-error');
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

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-42583982-2', 'magnet.com');
ga('send', 'pageview');