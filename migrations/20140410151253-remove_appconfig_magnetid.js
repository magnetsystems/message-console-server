/* Remove magnetId from AppConfigs table */
module.exports = {
    up: function(migration, DataTypes, done) {
        migration.removeColumn('AppConfigs', 'magnetId');
        done();
    },
    down: function(migration, DataTypes, done){
        migration.addColumn('AppConfigs', 'magnetId', {
            type     : DataTypes.STRING,
            unique   : true,
            validate : {
                isUUID : 1
            }
        });
        done();
    }
}
