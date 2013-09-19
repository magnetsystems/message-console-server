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
        console.info("Created User schema successfully");
    }).error(function (error) {
        console.error("Could not create User schema! - Did you enter wrong database credentials?");
    });

}

module.exports = new Schemas();