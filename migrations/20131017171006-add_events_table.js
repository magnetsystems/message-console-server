/* create a new table for audit trails called 'Event' */
module.exports = {
    up : function(migration, DataTypes, done){
        migration.createTable('Events', {
            magnetId : {
                type     : DataTypes.STRING,
                unique   : true,
                validate : { isUUID : 1 }
            },
            level : {
                type     : DataTypes.STRING,
                validate : { notEmpty : true }
            },
            UserId : {
                type     : DataTypes.INTEGER,
                validate : { notEmpty : true }
            },
            message : {
                type : DataTypes.STRING
            },
            targetModel : {
                allowNull : true,
                type      : DataTypes.STRING
            },
            targetId : {
                allowNull : true,
                type      : DataTypes.INTEGER
            }
        });
        done();
    },
    down : function(migration, DataTypes, done){
        migration.dropTable('Events');
        done();
    }
}