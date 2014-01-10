define(['jquery', 'backbone', 'models/AnnouncementModel', 'collections/AnnouncementCollection'], function($, Backbone, AnnouncementModel, AnnouncementCollection){
    var View = Backbone.View.extend({
        el: "#mgmt-announcements",
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initAnnouncementsView', function(){
                me.col = new AnnouncementCollection();
                me.getCacheInfo();
                me.clear();
                me.fetch();
            });
            me.container = $('#create-announcement-container');
        },
        events: {
            'click #create-announcement': 'create',
            'click a.edit': 'edit',
            'click a.remove': 'remove',
            'click a.save': 'save',
            'click a.cancel': 'cancel',
            'click #update-announcements': 'updateCache'
        },
        fetch: function(){
            var me = this;
            me.$el.find('#mgmt-announcements-list').html('<img src="/images/ajax-loader.gif" style="padding:8px">');
            me.col.fetch({
                data : {
                    sorts : {
                        createdAt : 'desc'
                    }
                },
                success : function(){
                    me.render();
                }
            });
        },
        clear: function(){
            this.container.find('input, textarea').val('');
        },
        render: function(){
            var html = _.template($('#AnnouncementsView').html(), {
                col : this.col.models
            });
            $('#mgmt-announcements-list').html(html);
        },
        create: function(){
            var me = this;
            var obj = utils.collect(this.container).config;
            if(obj.subject != '' && obj.description != '' && obj.hyperlink != ''){
                var model = new AnnouncementModel();
                model.save(obj, {
                    success : function(){
                        me.clear();
                        me.fetch();
                    },
                    error : function(e){
                        alert(e);
                    }
                });
            }else{
                alert('Fill out the empty fields.');
            }
        },
        edit: function(e){
            e.preventDefault();
            var parent = $(e.currentTarget).closest('tr');
            parent.find('.editable').each(function(){
                $(this).html('<textarea class="span12" name="'+$(this).attr('did')+'">'+$(this).html()+'</textarea>');
            });
            parent.find('.edit, .remove').hide();
            parent.find('.save, .cancel').show();
        },
        save: function(e){
            var me = this;
            e.preventDefault();
            var parent = $(e.currentTarget).closest('tr');
            var obj = utils.collect(parent).config;
            var model = this.col.where({
                magnetId : parent.attr('did')
            })[0];
            model.save(obj, {
                success : function(){
                    me.reset(model, parent);
                },
                error : function(e){
                    alert(e);
                }
            })
        },
        cancel: function(e){
            e.preventDefault();
            var parent = $(e.currentTarget).closest('tr');
            var model = this.col.where({
                magnetId : parent.attr('did')
            })[0];
            this.reset(model, parent);
        },
        reset: function(model, dom){
            dom.find('.editable').each(function(){
                $(this).html(model.attributes[$(this).attr('did')]);
            });
            dom.find('.save, .cancel').hide();
            dom.find('.edit, .remove').show();
        },
        remove: function(e){
            e.preventDefault();
            if(confirm('Are you sure you wish to delete this announcement?') === true){
                var parent = $(e.currentTarget).closest('tr');
                var model = this.col.where({
                    magnetId : parent.attr('did')
                })[0];
                model.destroy({
                    success : function(){
                        parent.remove();
                    },
                    error : function(e){
                        alert(e);
                    }
                });
            }
        },
        getCacheInfo: function(){
            this.options.mc.query('news/getInfo', 'GET', null, function(res){
                $('#announcement-lastupdate').html(utils.ISO8601ToDT(res.updatedAt));
            });
        },
        updateCache: function(){
            this.options.mc.query('news/updateCache', 'POST', null, function(res){
                $('#announcement-lastupdate').html(utils.ISO8601ToDT(res.updatedAt));
            });
        }
    });
    return View;
});