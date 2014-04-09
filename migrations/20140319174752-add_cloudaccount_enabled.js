/* Add a new column in CloudAccounts table to disable a cloud account */
module.exports = {
    up: function(migration, DataTypes, done) {
        migration.addColumn('CloudAccounts', 'enabled', {
            type         : DataTypes.BOOLEAN,
            defaultValue : true
        });
        done();
    },
    down: function(migration, DataTypes, done){
        migration.removeColumn('CloudAccounts', 'enabled');
        done();
    }
}
