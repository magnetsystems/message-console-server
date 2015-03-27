define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        initialize: function(){
            this.setElement('#confirm-alert');
            var dom = $(this.el);
            dom.modal({
                show     : false,
                keyboard : true,
                backdrop : true
            });
            dom.on('hidden.bs.modal', function(){
                dom.find('.btn-primary').html('Yes');
                dom.find('.btn-default').html('No');
            });
        },
        events: {
            "click button.submit": "doConfirm",
            "click .btn-default": "doCancel"
        },
        display: function(vars, callback, cancelback){
            if(vars && typeof callback === typeof Function){
                $(this.el).modal('show');
                $(this.el).find('.modal-title').html(vars.title);
                $(this.el).find('.modal-body').html(vars.content);
                if(vars.btns){
                    $(this.el).find('.btn-primary').html(vars.btns.yes);
                    $(this.el).find('.btn-default').html(vars.btns.no);
                }
                this.callback = callback;
                this.cancelback = cancelback;
            }
        },
        doConfirm: function(vars){
            $(this.el).modal('hide');
            this.callback();
        },
        doCancel: function(vars){
            $(this.el).modal('hide');
            (this.cancelback || function(){})();
        }
    });
    return View;
});