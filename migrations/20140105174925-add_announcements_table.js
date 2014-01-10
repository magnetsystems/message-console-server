/* create a new table for home page announcements called 'Announcements' */
module.exports = {
    up : function(migration, DataTypes, done){
        migration.createTable('Announcements', {
            magnetId : {
                type     : DataTypes.STRING,
                unique   : true,
                validate : { isUUID : 1 }
            },
            subject : {
                type     : DataTypes.TEXT,
                validate : { notEmpty : true }
            },
            description : {
                type     : DataTypes.TEXT,
                validate : { notEmpty : true }
            },
            hyperlink : {
                type : DataTypes.TEXT
            },
            UserId : {
                type     : DataTypes.INTEGER,
                validate : { notEmpty : true }
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
        migration.dropTable('Announcements');
        done();
    }
}