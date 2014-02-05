/* Add a new column in AppConfig table to display a youtube video */
module.exports = {
    up: function(migration, DataTypes, done) {
        migration.addColumn('AppConfigs', 'homePageVideoID', {
            type         : DataTypes.STRING,
            defaultValue : ''
        });
        done();
    },
    down: function(migration, DataTypes, done){
        migration.removeColumn('AppConfigs', 'homePageVideoID');
        done();
    }
}
