/*
function Models(){

    var User = GLOBAL.db.define('User', {});
    User.sync().success(function(){
        console.log("Created User schema successfully");
    }).error(function(error){
        console.log("Could not create User schema!");
    });
}
*/

var orm = require('../orm')
, Seq = orm.Seq();

module.exports = {
    model : {
        // TODO: Add tracking and credentials
        firstName        : Seq.STRING,
        lastName         : Seq.STRING,
        userName         : Seq.STRING,
        email            : Seq.STRING,
        dateAcceptedEULA : Seq.DATE,
        password         : Seq.STRING,
        country          : Seq.STRING,
        company          : Seq.STRING,
        userType         : Seq.STRING
    },
    relations : {
        //hasMany : "World"
    },
    options : {
        //freezeTableName : true
    }
};