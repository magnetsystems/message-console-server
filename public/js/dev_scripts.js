$(document).ready(function(){
    if(getParameterByName('dl')) document.getElementById('downloader').src = $('.sdk-section a').attr('href');
    var r2m = $('#r2m-demo');
    if(r2m.length) initR2M(r2m);
    var mmx = $('#messaging-demo');
    if(mmx.length) initMessaging(mmx);
    var mp = $('#persistence-demo');
    if(mp.length) initPersistence();
});

function initR2M(container){
    var select = container.find('select');
    var tabContent = container.find('.tab-content');
    select.val('disable');
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
        select.popover('destroy');
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
    function showR2MCode(did){
        tabs.removeClass('active');
        $('.'+did).addClass('active');
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
            espn     : 'ESPN',
            distance : 'Google Distance',
            timezone : 'Google Time Zone'
        },
        urls : {
            espn     : 'https://wmerydith-espn.p.mashape.com/sports/news?apikey=fnbkkygduuavvvmg2y846vmh',
            distance : 'http://maps.googleapis.com/maps/api/distancematrix/json?origins=435+Tasso+Street+Palo+Alto+CA',
            timezone : 'https://maps.googleapis.com/maps/api/timezone/json?location=39.6034810,-119.6822510'
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
    var editor;
    editor = ace.edit('persistence-demo-code');
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
        element : 'sample-persistence-android'
    });
    editor.setValue(tmpl.render(), 1);
    editor.gotoLine(1);
}

function getParameterByName(name){
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}