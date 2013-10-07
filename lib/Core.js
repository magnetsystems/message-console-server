function Core(){
    this.start();
}

Core.prototype.start = function(){
    winston.log('App: initialized');
}

module.exports = new Core();