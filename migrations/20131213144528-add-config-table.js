/* create a new table for app configuration called 'AppConfigs' */
module.exports = {
    up : function(migration, DataTypes, done){
        migration.createTable('AppConfigs', {
            magnetId : {
                type     : DataTypes.STRING,
                unique   : true,
                validate : { isUUID : 1 }
            },
            skipAdminApproval : {
                type         : DataTypes.BOOLEAN,
                defaultValue : true,
                validate     : { notEmpty : true }
            },
            id : {
                type          : DataTypes.INTEGER,
                primaryKey    : true,
                autoIncrement : true
            },
            createdAt : {
                type : DataTypes.DATE
            },
            updatedAt : {
                type : DataTypes.DATE
            }
        });
        done();
    },
    down : function(migration, DataTypes, done){
        migration.dropTable('AppConfigs');
        done();
    }
}