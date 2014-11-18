$(document).ready(function(){
    var loadCtr = 0;
    var select = $('#url-select');
    select.val('disable');
    select.focus();
    select.popover({
        html    : true,
        trigger : 'click',
        content : 'Our demonstration will show you how easy it is!'
    });
    select.popover('show');
    var canGenerate = false;
    var processOff = $('#processing-off');
    var processOn = $('#processing-on');
    var processDone = $('#processing-done');
    var generateOff = $('#generate-off');
    var generateOn = $('#generate-on');
    var content = $('#tab-content-container');
    var tabs = $('.nav-tabs li');
    var tabPane = content.find('.tab-pane > div');
    var codeContainers = $('.code-container');
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
        if(api == 'disable'){
            processOn.html('');
            processDone.hide();
            processOff.show();
            generateOn.hide();
            generateOff.show();
            canGenerate = false;
        }else{
            processDone.hide();
            processOn.html('');
            processOff.show();
            generateOff.hide();
            generateOn.show();
            canGenerate = true;
        }
        setTimeout(function(){
            changeSelect(select, api);
        }, 10);
        tabs.removeClass('enabled');
        $('.nav-tabs > li, .tab-pane').removeClass('active');
    });
    var timeoutCB;
    var isGen = false;
    $('#generate-btn').click(function(e){
        e.preventDefault();
        if(!canGenerate) return false;
        if(!isGen){
            isGen = true;
            processOff.hide();
            processDone.hide();
            processOn.html('<img src="img/animated-cube.gif#'+(++loadCtr)+'" />');
            generateOff.hide();
            generateOn.show();
            $('#loading-screen').show();
            $('#main-part1, #main-part2, #main-part3').css('opacity', '.3');
            clearTimeout(timeoutCB);
            timeoutCB = setTimeout(function(){
                $('#loading-screen').hide();
                $('#main-part1, #main-part2, #main-part3').css('opacity', '1');
                processOff.hide();
                processOn.html('');
                processDone.show();
                tabs.addClass('enabled');
                showCode('android');
                isGen = false;
            }, 1300);
        }
    });
    $('.nav-tabs a').click(function(){
        if($('.nav-tabs li:first').hasClass('enabled')){
            var did = $(this).closest('li').attr('did');
            showCode(did);
        }
    });
    function showCode(did){
        tabs.removeClass('active');
        $('.'+did).addClass('active');
        $('#tab-content-container > .tab-pane').removeClass('active');
        $('#'+did).addClass('active');
        if(editor){
            editor.destroy();
            editor = undefined;
            codeContainers.html('');
        }
        $('#'+did+'-code').replaceWith('<div id="'+did+'-code"></div>');
        var foo;
        switch(did){
            case 'android': foo = 'java'; break;
            case 'ios': foo = 'objectivec'; break;
            case 'js': foo = 'javascript'; break;
            case 'curl': foo = 'javascript'; break;
        }
        editor = ace.edit(did+'-code');
        editor.setTheme('ace/theme/chrome');
        editor.getSession().setMode('ace/mode/'+foo);
        editor.setShowPrintMargin(false);
        editor.renderer.setShowGutter(false);
        editor.renderer.setScrollMargin(8, 8, 12, 12);
        editor.setHighlightActiveLine(false);
        editor.getSession().setUseWrapMode(true);
        editor.setOptions({
            maxLines : 15,
            minLines : 1
        });
        editor.setValue($('#sample-'+api+'-'+did).text(), 1);
        editor.gotoLine(1);
    }
});
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