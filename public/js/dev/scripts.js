$(document).ready(function(){
//    function getParameterByName(name){
//        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
//        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
//            results = regex.exec(location.search);
//        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
//    }
//    var dl = getParameterByName('dl');
//    if(dl){
//        var ifm = document.getElementById('downloader');
//        ifm.src = 'download/';
//    }else{
//        $('#subtitle .sdk-section').show();
//    }
    bindFeedbackButton();
});
function bindFeedbackButton(){
    var div = $('#feedback-content');
    var complete = $('#feedback-complete');
    var error = $('#feedback-error');
    var btn = $('#feedback-btn');
    var submitBtn = $('#submit-feedback-btn');
    var loader = $('#feedback-content img');
    var isActive = false;
    var closed = {
        height  : 0,
        width   : 0,
        padding : 0,
        opacity : 0
    };
    div.each(function(){
        $.data(this, 'baseHeight', $(this).height());
        $.data(this, 'baseWidth', $(this).width());
        $('#leave-feedback-container').css('opacity', '1');
    }).css(closed);
    btn.click(function(e){
        e.preventDefault();
        if(btn.hasClass('active')){
            btn.removeClass('active');
            complete.hide('slow');
            error.hide('slow');
            div.animate(closed, 600);
        }else{
            setTimeout(function(){
                btn.addClass('active');
                complete.hide('slow');
                error.hide('slow');
                div.animate({
                    height  : div.data('baseHeight') + 20,
                    width   : div.data('baseWidth'),
                    padding : '10px',
                    opacity : 1
                }, 600);
            }, 100);
        }
    });
    $('html').click(function(e){
        if(btn.hasClass('active')){
            btn.removeClass('active');
            complete.hide('slow');
            error.hide('slow');
            div.animate(closed, 600);
        }
    });
    $('#leave-feedback-container').click(function(e){
        e.stopPropagation();
    });
    submitBtn.click(function(e){
        e.stopPropagation();
        e.preventDefault();
        var type = $('#feedback-type-field');
        var sub = $('#feedback-subject');
        var msg = $('#feedback-message');
        var email = $('#feedback-email');
        if(isActive === false && $.trim(msg.val()).length > 0){
            isActive = true;
            submitBtn.hide();
            loader.show();
            $.ajax({
                type        : 'POST',
                url         : '/rest/submitFeedback',
                data        : {
                    type  : type.val(),
                    msg   : msg.val(),
                    sub   : sub.val(),
                    email : email.val()
                },
                contentType : 'application/x-www-form-urlencoded'
            }).done(function(){
                complete.show('slow');
            }).fail(function(){
                error.show('slow');
            }).always(function(){
                msg.val('');
                sub.val('');
                email.val('');
                div.css(closed);
                isActive = false;
                submitBtn.show();
                loader.hide();
            });
        }
    });
}