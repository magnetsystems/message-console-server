$(document).ready(function(){
    bindEvents();
    if(getParameterByName('dl')){
        popSignUp();
        document.getElementById('downloader').src = $('.sdk-section a').attr('href');
    }
    var r2m = $('#r2m-demo');
    if(r2m.length) initR2M(r2m);
    var mmx = $('#messaging-demo');
    if(mmx.length) initMessaging(mmx);
    var mp = $('#persistence-body');
    if(mp.length) initPersistence();
});
function bindEvents(){
    $.fn.vAR = function(){
        return this.each(function(i){
            var dom = $(this);
            var ah = dom.height();
            var ph = dom.parent().height();
            var mh = Math.ceil((ph-ah) / 2);
            dom.css('margin-top', mh-34);
        });
    };
    $('.valign').vAR();
    var resize;
    window.onresize = function(){
        clearTimeout(resize);
        resize = setTimeout(function(){
            $('.valign').vAR();
        }, 100);
    };
}

function popSignUp(){
    var modal = $('#download-plugin-modal');
    modal.find('input').val('');
    modal.modal('show');
}

function initR2M(container){
    var select = container.find('select');
    var tabContent = container.find('.tab-content');
//    select.focus();
//    select.popover({
//        html    : true,
//        trigger : 'click',
//        content : 'Our demonstration will show you how easy it is!'
//    });
//    select.popover('show');
    var tabs = container.find('.nav-tabs li');
    var codeContainers = container.find('.code-container');
    var editor;
    var api;
    select.click(function(){
//        select.popover('destroy');
        if($(this).hasClass('activated')){
            $(this).removeClass('activated');
        }else{
            $(this).addClass('activated');
            if(navigator.userAgent.indexOf("Safari") == -1)
                changeSelect($(this));
        }
    });
    select.change(function(){
        if(editor){
            codeContainers.html('');
            editor.destroy();
            editor = undefined;
        }
        api = $(this).val();
        setTimeout(function(){
            changeSelect(select, api);
        }, 10);
        $('.nav-tabs > li, .tab-pane').removeClass('active');
        if(api != 'disable'){
            container.find('.tab-content, .nav-tabs, #r2m-step2').show();
            showR2MCode('android');
        }else{
            container.find('.tab-content, .nav-tabs, #r2m-step2').hide();
        }
    });
    $('.nav-tabs a').click(function(){
        var did = $(this).closest('li').attr('did');
        showR2MCode(did);
    });
    api = 'distance';
    select.val(api);
    setTimeout(function(){
        changeSelect(select, api);
    }, 10);
    showR2MCode('android');
    function showR2MCode(did){
        tabs.removeClass('active');
        container.find('.'+did).addClass('active');
        tabContent.find('.tab-pane').removeClass('active');
        $('#r2m-demo-'+did).addClass('active');
        if(editor){
            editor.destroy();
            editor = undefined;
            codeContainers.html('');
        }
        $('#r2m-demo-'+did+'-code').replaceWith('<div id="'+did+'-code"></div>');
        var foo;
        switch(did){
            case 'android': foo = 'java'; break;
            case 'ios': foo = 'objectivec'; break;
            case 'js': foo = 'javascript'; break;
            case 'curl': foo = 'javascript'; break;
        }
        editor = ace.edit(did+'-code');
        editor.setOptions({
            maxLines: Infinity
        });
        editor.setTheme('ace/theme/chrome');
        editor.getSession().setMode('ace/mode/'+foo);
        editor.setShowPrintMargin(false);
        editor.renderer.setShowGutter(false);
        editor.renderer.setScrollMargin(8, 8, 12, 12);
        editor.setHighlightActiveLine(false);
        editor.getSession().setUseWrapMode(true);
        editor.setOptions({
            minLines : 1
        });
        editor.setValue($('#sample-'+api+'-'+did).text(), 1);
        editor.gotoLine(1);
    }
}
function changeSelect(dom, sel){
    var vals = {
        defaults : {
            earthquake : 'SEISMI Earthquake',
            distance   : 'Google Distance',
            timezone   : 'Google Time Zone'
        },
        urls : {
            earthquake : 'http://www.seismi.org/api/eqs/{yyyy:2014}/{mm:01}?min_magnitude=6&limit=500',
            distance   : 'http://maps.googleapis.com/maps/api/distancematrix/json?origins=435+Tasso+Street+Palo+Alto+CA',
            timezone   : 'https://maps.googleapis.com/maps/api/timezone/json?location=39.6034810,-119.6822510'
        }
    }
    dom.find('option').each(function(){
        var val = $(this).val();
        $(this).text(vals[val == sel ? 'urls' : 'defaults'][val]);
    });
}

function initMessaging(container){
    var editor;
    container.find('input').val('');
    var code = $('#messaging-demo-code');
    var output = container.find('#messaging-demo-phone-wrapper > div');
    container.find('.btn').click(function(){
        var select = container.find('select');
        var input = container.find('input');
        output.html('<img src="/img/site/ajax-loader-sm.gif" />');
        setTimeout(function(){
            output.text(input.val());
        }, (Math.floor((Math.random() * 1300) + 100)));
        showMessagingCode(select.val(), input.val());
    });
    function showMessagingCode(did, val){
        if(editor){
            editor.destroy();
            editor = undefined;
            code.html('');
        }
        did = did.split('-');
        var lang;
        switch(did[1]){
            case 'android': lang = 'java'; break;
            case 'ios': lang = 'objectivec'; break;
            case 'js': lang = 'javascript'; break;
        }
        code.html('<div id="'+did[1]+'-code"></div>');
        editor = ace.edit(did[1]+'-code');
        editor.setOptions({
            maxLines: Infinity
        });
        editor.setTheme('ace/theme/chrome');
        editor.getSession().setMode('ace/mode/'+lang);
        editor.setShowPrintMargin(false);
        editor.renderer.setShowGutter(false);
        editor.renderer.setScrollMargin(8, 8, 12, 12);
        editor.setHighlightActiveLine(false);
        editor.getSession().setUseWrapMode(true);
        editor.setOptions({
            minLines : 1
        });
        var tmpl = new EJS({
            element : 'sample-'+did[0]+'-'+did[1]
        });
        editor.setValue(tmpl.render({
            val : val
        }), 1);
        editor.gotoLine(1);
    }
}

function initPersistence(){
    var editor, editor2, editor3;
    editor = ace.edit('persistence-demo-code1');
    editor.setOptions({
        maxLines : Infinity
    });
    editor.setTheme('ace/theme/chrome');
    editor.getSession().setMode('ace/mode/java');
    editor.setShowPrintMargin(false);
    editor.renderer.setShowGutter(false);
    editor.renderer.setScrollMargin(8, 8, 12, 12);
    editor.setHighlightActiveLine(false);
    editor.getSession().setUseWrapMode(true);
    editor.setOptions({
        minLines : 1
    });
    var tmpl = new EJS({
        element : 'sample-persistence-android-create'
    });
    editor.setValue(tmpl.render(), 1);
    editor.gotoLine(1);


    editor2 = ace.edit('persistence-demo-code2');
    editor2.setOptions({
        maxLines : Infinity
    });
    editor2.setTheme('ace/theme/chrome');
    editor2.getSession().setMode('ace/mode/java');
    editor2.setShowPrintMargin(false);
    editor2.renderer.setShowGutter(false);
    editor2.renderer.setScrollMargin(8, 8, 12, 12);
    editor2.setHighlightActiveLine(false);
    editor2.getSession().setUseWrapMode(true);
    editor2.setOptions({
        minLines : 1
    });
    var tmpl2 = new EJS({
        element : 'sample-persistence-android-read'
    });
    editor2.setValue(tmpl2.render(), 1);
    editor2.gotoLine(1);


    editor3 = ace.edit('persistence-demo-code3');
    editor3.setOptions({
        maxLines : Infinity
    });
    editor3.setTheme('ace/theme/chrome');
    editor3.getSession().setMode('ace/mode/java');
    editor3.setShowPrintMargin(false);
    editor3.renderer.setShowGutter(false);
    editor3.renderer.setScrollMargin(8, 8, 12, 12);
    editor3.setHighlightActiveLine(false);
    editor3.getSession().setUseWrapMode(true);
    editor3.setOptions({
        minLines : 1
    });
    var tmpl3 = new EJS({
        element : 'sample-persistence-android-delete'
    });
    editor3.setValue(tmpl3.render(), 1);
    editor3.gotoLine(1);
}

function getParameterByName(name){
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}