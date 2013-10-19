/* create a new column for activate/suspend under User table called 'activated' */
module.exports = {
    up : function(migration, DataTypes, done){
        migration.addColumn('Users', 'activated', {
            type         : DataTypes.BOOLEAN,
            defaultValue : true,
            validate : { notEmpty : true }
        });
        done();
    },
    down : function(migration, DataTypes, done){
        migration.removeColumn('Users', 'activated');
        done();
    }
}