var EmailJS = require('emailjs/email')
    , ejs = require('ejs')
    , fs = require('fs')
    , _ = require('underscore');

ejs.open = '{{';
ejs.close = '}}';

var EmailService = function(){
    this.emailTmplPath = './views/email';
    return this;
}

/* initiate EmailJS server */

EmailService.prototype.server = EmailJS.server.connect({
    host 	 : ENV_CONFIG.Email.host,
    user 	 : ENV_CONFIG.Email.user,
    port 	 : ENV_CONFIG.Email.port,
    password : ENV_CONFIG.Email.password,
    tls      : true
});

/* general email */

EmailService.prototype.sendEmail = function(params){
    this.server.send({
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
            winston.error('EmailService: error sending email: ', e, msg);
            if(typeof params.error == typeof Function){
                params.error('error-sending-email');
            }
        }else{
            if(typeof params.success == typeof Function){
                params.success(msg);
            }
        }
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
}

module.exports = new EmailService();