function Schemas(){
    var User = GLOBAL.db.define('User', {


        // TODO: Add tracking and credentials
        firstName: GLOBAL.Sequelize.STRING,
        lastName: GLOBAL.Sequelize.STRING,
        userName: GLOBAL.Sequelize.STRING,
        email: GLOBAL.Sequelize.STRING,
        dateAcceptedEULA: GLOBAL.Sequelize.DATE,
        password: GLOBAL.Sequelize.STRING,
        country: GLOBAL.Sequelize.STRING,
        company: GLOBAL.Sequelize.STRING,
        userType: GLOBAL.Sequelize.STRING
//        credentials: Sequelize.NUmer



    });

    // event handling:
    User.sync().success(function () {
        // ok ... everything is nice!
        console.log("Created User schema successfully");
    }).error(function (error) {
        console.log("Could not create User schema!");
    });

}

module.exports = new Schemas();