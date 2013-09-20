var EmailSettings = require('./config/EmailSettings')
, EmailJS = require('emailjs/email')
, ejs = require('ejs')
, fs = require('fs')
, _ = require('underscore');

ejs.open = '{{';
ejs.close = '}}';

var EmailService = function(){
    this.EmailSettings = EmailSettings;
    this.emailTmplPath = './views/email';
    return this;
}

/* initiate EmailJS server */

EmailService.prototype.server = EmailJS.server.connect({
	host 	 : EmailSettings.host,
	user 	 : EmailSettings.user,
    port 	 : EmailSettings.port,
	password : EmailSettings.password,
    tls      : true
});

/* send password recovery email */

EmailService.prototype.sendPasswordResetEmail = function(user, host, callback){
	this.server.send({
		from       : EmailSettings.sender,
		to         : user.email,
		subject    : 'Password Reset',
		text       : 'There was an error. Please contact support.',
		attachment : this.composeEmail(user, host)
	}, function(e, msg){
        if(msg){
            callback(null, msg);
		}else{
            for(var i in e){
                console.log('EmailService: error sending password recovery email: ', i, e[i]);
            }
			callback('error-sending-email');
		}	
    });
}

/* generate password recovery email body */

EmailService.prototype.composeEmail = function(user){
	var api = host + '/reset-password?e=' + user.email + '&p=' + user.password;
	var html = "<html><body>";
		html += "Hi " + user.name.first + ",<br /><br />";
		html += "We have received a request to reset your password. If you have<br />not requested a password reset, please disregard this email.<br><br>";
		html += "<a href='" + api + "'>Click here to reset your password</a>.<br /><br />";
		html += "Best Regards,<br>";
		html += "Administrator<br><a href='#'>Website</a><br>";
		html += "</body></html>";
	return [{
        data        : html, 
        alternative : true
    }];
}

/* general email */

EmailService.prototype.sendEmail = function(params){
    this.server.send({
        from       : EmailSettings.sender,
        to         : params.to,
        subject    : params.subject,
        text       : params.text || params.html,
        attachment : [{
            data        : params.html,
            alternative : true
        }]
    }, function(e, msg){
        if(e){
            console.log('EmailService: error sending email: ', e);
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
    _.extend(params.vars, {
        emailBody : params.sub ? ejs.render(fs.readFileSync(this.emailTmplPath + '/'+params.sub+'.ejs', 'ascii'), params.vars) : ''
    });
    return ejs.render(fs.readFileSync(this.emailTmplPath + '/'+params.main+'.ejs', 'ascii'), params.vars);
}

module.exports = new EmailService();