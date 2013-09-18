/* handle route files */

var fs = require('fs');

module.exports = function(app){
    fs.readdirSync(__dirname).forEach(function(file){
        if (file == "index.js" || file.indexOf('.js') == -1) return;
        var name = file.substr(0, file.indexOf('.'));
        require('./' + name)(app);
    });
}
