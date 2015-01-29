define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: "#list-placeholder",
        initialize: function(){
            var me = this;
            // initialize the view
            me.options.eventPubSub.bind("initListView", function(params){
                me.setElement(params.el);
                me.options.col = params.col;
                me.options.headers = params.headers;
                me.options.data = params.data;
                me.options.disableInfo = params.disableInfo;
                me.options.searchBy = params.searchBy;
                me.options.disableControls = params.disableControls;
                me.options.hideSearch = params.hideSearch;
                me.options.selectable = params.selectable;
                me.options.commands = params.commands;
                // render list with collection data
                me.renderContainer();
                me.$el.find('tbody').html('<tr><td class="loader" colspan="30"><img src="../images/ajax-loader.gif" /></td></tr>');
                me.query = {};
                me.doSort(undefined, params.sortDefault);
            });
            me.options.eventPubSub.bind("refreshListView", function(uiOnly){
                if(uiOnly){
                    me.buildList();
                }else{
                    me.fetch();
                }
            });
        },
        events: {
            "click tbody tr": "selectRow",
            "click .dropdown-toggle": "toggleDropdown",
            "click thead th": "doSort",
            "click .dropdown-menu a": "searchBy",
            "click .execute-batch-command": "executeBatchCommand",
            "click .breadcrumb span button": "removeSort",
            "click .btn-clear": "resetSearch",
            "click .btn-primary": "doSearch",
            "click .pagination-container li a": "paginate",
            "change input[type='text']": "toggleRemoveIcon",
            "keypress .input-container input[type=text]": "filterOnEnter"
        },
        // render table header
        renderContainer: function(){
            var template = _.template($("#tableTmplView").html(), {
                headers         : this.options.headers,
                disableInfo     : this.options.disableInfo,
                searchBy        : this.options.searchBy,
                hideSearch      : this.options.hideSearch,
                selectable      : this.options.selectable,
                commands        : this.options.commands,
                disableControls : this.options.disableControls
            });
            this.$el.html(template);
            return this;
        },
        // render table body
        render: function(params){
            var template = _.template($("#tableItemView").html(), params);
            if(params.append){
                this.$el.find('tbody').append(template);
            }else{
                this.$el.find('tbody').html(template);
            }
            return this;
        },
        // render paging
        renderPagination: function(params){
            if(params.paging){
                params.paging.previous = params.paging.start - 10;
                if((params.paging.start+10) <= params.paging.total){
                    params.paging.next = parseInt(params.paging.start) + 10;
                }
                var template = _.template($("#paginationDetailView").html(), params);
                this.$el.find('.pagination-container').html(template);
            }
        },
        buildList: function(append){
            this.render({
                headers     : this.options.headers, 
                collection  : this.options.col.models,
                disableInfo : this.options.disableInfo,
                append      : append
            });
            this.renderPagination({
                paging : this.options.col.paging
            });
        },
        // fix for android click event firing twice
        ignoreTimer: function(callback){
            var me = this;
            if(!me.invalid && /Android/i.test(navigator.userAgent)){
                me.invalid = true;
                setTimeout(function(){
                    me.invalid = false;
                }, 500);
                callback();
            }else{
                callback();
            }
        },
        toggleDropdown: function(e){
            var me = this;
            var item = $(e.currentTarget).closest('.btn-group');
            if(item.hasClass('open')){
                item.removeClass('open');
            }else{
                item.addClass('open');
            }
        },
        // bind table row select to trigger basic info display
        selectRow: function(e, dom){
            var me = this;
            if(!me.options.disableInfo){
                e.preventDefault();
                me.ignoreTimer(function(){   
                    var item;
                    if(dom){
                        item = dom;
                    }else{
                        item = $(e.currentTarget).closest('tr');
                    }
                    if(typeof item.attr('data-id') != 'undefined'){
                        me.$el.find('tbody tr').removeClass('info');
                        item.addClass('info');
                        var model = me.options.col.where({
                            magnetId : item.attr('data-id')
                        });
                        me.options.eventPubSub.trigger("displayInfoView", model[0]);
                    }
                });
            }
        },
        // handle table header sort by column and direction
        doSort: function(e, sortDefault){
            var me = this, th;
            me.ignoreTimer(function(){
                if(!e){
                    if(sortDefault){
                        th = me.$el.find('thead th[p="'+sortDefault.property+'"]');
                        if(sortDefault.order == 'desc'){
                            th.children('span').addClass('glyphicon glyphicon-arrow-up');
                        }
                    }else{
                        th = me.$el.find('thead th').first();
                    }
                }else{
                    th = $(e.currentTarget);
                }
                var property = th.attr('p');
                if(property){
                    if(!me.options.disableControls){
                        if(th.find('span').hasClass('glyphicon glyphicon-arrow-up')){
                            th.find('span').removeClass().addClass('glyphicon glyphicon-arrow-down');
                        }else{
                            th.find('span').removeClass().addClass('glyphicon glyphicon-arrow-up');
                        }
                        var sorts = me.$el.find('.breadcrumb > span');
                        if(!sorts.find('button[p="'+property+'"]').length){
                            sorts.append('<button class="btn btn-default" type="button" p="'+property+'">'+th.html()+'<span class="glyphicon glyphicon-remove"></span></button>');
                        }else{
                            sorts.find('button[p="'+property+'"]').html(th.html()+'<span class="glyphicon glyphicon-remove"></span>');
                        }
                        me.collectSorts();
                    }
                    me.fetch();
                }
            });
        },
        // remove a sort column item
        removeSort: function(e){
            $(e.currentTarget).remove();
            var property = $(e.currentTarget).attr('p');
            this.$el.find('thead th[p="'+property+'"] span').removeClass();
            this.collectSorts();
        },
        // select search by parameter
        searchBy: function(e){
            e.preventDefault();
            this.$el.find('.dropdown-menu li').removeClass('active');
            $(e.currentTarget).closest('.btn-group').removeClass('open');
            $(e.currentTarget).closest('li').addClass('active');
            this.$el.find('.searchby-text').html('Search By: '+$(e.currentTarget).html());
        },
        // execute batch command
        executeBatchCommand: function(){
            var me = this;
            var action = me.$el.find('.batch-commands li.active a').attr('c');
            var command = me.options.commands[action];
            if(action && command){
                var uris = [];
                me.$el.find('input[type="checkbox"]:checked').each(function(){
                    uris.push('magnet:/'+me.options.root+'/'+$(this).closest('tr').attr('data-id'));
                });
                me.options.mc.batchCommand($.extend({}, command, {
                    data    : uris,
                    success : function(){
                        Alerts.General.display({
                            title   : 'Batch Command Executed', 
                            content : 'The batch command "'+command.name+'" has been executed successfully.'
                        });
                    },
                    error  : function(){
                        Alerts.Error.display({
                            title   : 'Batch Command Failed', 
                            content : 'The batch command "'+command.name+'" could not be executed.'
                        });
                    }
                }));
            }
        },
        // switch between pages of dataset
        paginate: function(e){
            e.preventDefault();
            var item = $(e.currentTarget), nextPage  = '';
            if(!item.closest('li').hasClass('disabled')){
                this.query.page = item.attr('page');
                // if nextPageUrl is not present, check if a stored nextPageUrl is available. This is a fix for the last page of results returned by an _magnet_query
                if(!this.options.col.paging.nextPageUrl && this.options.col.paging.totalSize > 10){
                }else{
                    nextPage = this.options.col.paging.nextPageUrl;
                }
                this.query.nextPage = nextPage;
                this.fetch();   
            }
        },
        // retrieve search querystring parameters from UI and fetch
        doSearch: function(){
            var me = this;
            me.query.search = {};
            var property = me.$el.find('.dropdown-menu li.active a').attr('p');
            var str = $.trim(me.$el.find('input').val());
            if(str != ''){
                if(typeof property !== typeof undefined){
                    var obj = {};
                    obj[property] = str;
                    me.query.search = [obj];
                }else{
                    Alerts.Error.display({title:'Select "Search By" Property', content:"Select a property to search for before the search."});
                    return false;
                }             
            }
            me.query.nextPage = '';
            me.query.page = '';
            me.fetch();   
        },
        // retrieve sort querystring parameters from UI 
        collectSorts: function(){
            var me = this;
            me.query.sorts = {};
            me.$el.find('.breadcrumb span button').each(function(){
                me.query.sorts[$(this).attr('p')] = $(this).find('span').hasClass('glyphicon glyphicon-arrow-up') ? 'asc' : 'desc';
            });
            me.query.nextPage = '';
            me.query.page = '';
        },
        // fetch collection of models and create a table of data using filter parameters
        fetch: function(append){
            var me = this;
            var data = $.extend({}, me.options.data, me.query);
            if(me.options.data && me.options.data.search){
                data.search = me.options.data.search.concat(me.query.search || []);
            }
            // if we aren't appending to the collection of models, reset the collection to remove old results
            if(!append){
                me.options.col.reset();
            }
            me.options.col.fetch({
                data: data,
                success: function(){
                    me.buildList(append);
                },
                error: function(xhr, ajaxOptions, thrownError){
                    // catch _magnet_query cache timeout and retrieve new list of results. TODO: stop using _magnet_queries!!
                    if((xhr.status == 404 || xhr.status == 500) && data.page){
                        var tempData = $.extend({}, data);
                        data.page = tempData.page;
                        delete tempData.page;
                        delete tempData.nextPage;
                        me.options.col.fetch({
                            data: tempData,
                            success: function(col, res){
                                me.options.col.reset();
                                data.nextPage = res.paging.nextPageUrl;
                                me.options.col.fetch({
                                    data: data,
                                    success: function(col, res){
                                        me.buildList(append);
                                    }
                                });
                            }
                        });
                    }
                }
            });
        },
        destroy: function(){
            this.undelegateEvents();
            $(this.el).removeData().unbind(); 
        },
        toggleRemoveIcon: function(){
            if($.trim(this.$el.find('input[type="text"]').val()) != ''){
                this.$el.find('.btn-clear').show('fast');
            }else{
                this.$el.find('.btn-clear').hide('fast');
            }
        },
        resetSearch: function(){
            this.$el.find('input[type="text"]').val('');
            this.$el.find('.btn-clear').hide('fast');
        },
        filterOnEnter: function(e){
            if(e.keyCode != 13){
                return;
            }else{
                this.doSearch();
            }
        }
    });
    return View;
});