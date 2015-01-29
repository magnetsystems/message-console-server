var fs = require('fs');

module.exports = function(app){

    if(!ENV_CONFIG.App.configured){
        return require('./bootstrap.js')(app);
    }

    fs.readdirSync(__dirname).forEach(function(file){
        if (file == 'bootstrap.js' || file == 'index.js' || file.indexOf('.js') == -1) return;
        var name = file.substr(0, file.indexOf('.'));
        require('./' + name)(app);
    });

}
