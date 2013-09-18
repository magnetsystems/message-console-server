function Core(){
    this.start();
}

Core.prototype.start = function(){
    console.log('App: initialized');
}

module.exports = new Core();