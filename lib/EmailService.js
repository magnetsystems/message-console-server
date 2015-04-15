var EmailJS = require('emailjs/email')
, ConfigManager = require('./ConfigManager')
, ejs = require('ejs')
, fs = require('fs')
, _ = require('underscore');

ejs.open = '{{';
ejs.close = '}}';

var EmailService = function(){
    this.emailTmplPath = './views/email';
    return this;
};

EmailService.prototype.sendEmail = function(params){
    ConfigManager.get('Email', function(){
        var server = EmailJS.server.connect({
            host 	 : ENV_CONFIG.Email.host,
            user 	 : ENV_CONFIG.Email.user,
            port 	 : ENV_CONFIG.Email.port,
            password : ENV_CONFIG.Email.password,
            ssl      : ENV_CONFIG.Email.ssl,
            timeout  : ENV_CONFIG.Email.timeout || 5000,
            tls      : ENV_CONFIG.Email.tls
        });
        server.send({
            from       : ENV_CONFIG.Email.sender,
            to         : params.to,
            subject    : params.subject,
            text       : params.text || params.html,
            attachment : [{
                data        : params.html,
                alternative : true
            }]
        }, function(e, msg){
            if(e){
                winston.error('EmailService: error sending email: ', e);
                if(typeof params.error == typeof Function){
                    params.error('error-sending-email');
                }
            }else{
                if(typeof params.success == typeof Function){
                    params.success(msg);
                }
            }
        });
    });
};

EmailService.prototype.renderTemplate = function(params){
    try{
        _.extend(params.vars, {
            dateTime  : new Date(),
            emailBody : params.sub ? ejs.render(fs.readFileSync(this.emailTmplPath + '/'+params.sub+'.ejs', 'ascii'), params.vars) : ''
        });
        return ejs.render(fs.readFileSync(this.emailTmplPath + '/'+params.main+'.ejs', 'ascii'), params.vars);
    }catch(e){
        winston.error('EmailService: email rendering error: ', e);
        return '';
    }
};

module.exports = new EmailService();