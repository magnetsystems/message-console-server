/* Add a new column in AppConfig table to configure git sync interval */
module.exports = {
    up: function(migration, DataTypes, done) {
        migration.addColumn('AppConfigs', 'gitSyncInterval', {
            type         : DataTypes.INTEGER,
            defaultValue : 120
        });
        done();
    },
    down: function(migration, DataTypes, done){
        migration.removeColumn('AppConfigs', 'gitSyncInterval');
        done();
    }
}
