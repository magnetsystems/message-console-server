var mailchimp = require('mailchimp').MailChimpAPI;

var MailChimpManager = function(){
    var me = this;
    me.list;
    me.api = new mailchimp(ENV_CONFIG.MailChimp.apiKey, {
        version : '2.0',
        secure  : true
    });
    me.api.call('lists', 'list', {
        start : 0,
        limit : 25
    }, function(e, res){
        if(e){
            winston.error('MailChimp: failed to retrieve list. newsletter subscriptions will not work. Error: ', e);
        }else{
            for(var i=0;i<res.data.length;++i){
                if(res.data[i].name == ENV_CONFIG.MailChimp.listName){
                    me.list = res.data[i];
                }
            }
            if(!me.list){
                winston.error('MailChimp: failed to find a user list with the name "'+ENV_CONFIG.MailChimp.listName+'". newsletter subscriptions will not work.')
            }else{
                winston.verbose('MailChimp: found and associated user list "'+ENV_CONFIG.MailChimp.listName+'".');
            }
        }
    });
};

MailChimpManager.prototype.submit = function(email, vars, cb){
    this.api.call('lists', 'subscribe', {
        double_optin : false,
        merge_vars   : vars,
        id           : this.list.id,
        email        : {
            email : email
        }
    }, function(e, data){
        if(e){
            winston.error('MailChimp: failed to subscribe email "'+email+'" to user list "'+ENV_CONFIG.MailChimp.listName+'": ', e);
            var msg = 'failed-register';
            if(e.code == '214') msg = 'already-registered';
            cb(msg, null);
        }else{
            winston.verbose('MailChimp: registered email "'+email+'" to list "'+ENV_CONFIG.MailChimp.listName+'".');
            cb();
        }
    });
};

module.exports = new MailChimpManager();