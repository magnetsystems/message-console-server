define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        initialize: function(){
            this.setElement('#confirm-alert');
            $(this.el).modal({
                show     : false, 
                keyboard : true, 
                backdrop : true
            });
        },
        events: {
            "click button.submit": "doConfirm"
        },
        display: function(vars, callback){
            if(vars && typeof callback === typeof Function){ 
                $(this.el).modal('show');
                $(this.el).find('.modal-header h3').text(vars.title);
                $(this.el).find(' .modal-body p').text(vars.content);  
                this.callback = callback;
            }
        },
        doConfirm: function(vars){
            $(this.el).modal('hide');
            this.callback();
        }
    });
    return View;
});