/* Add mmx app validation to user table */
module.exports = {
    up : function(migration, DataTypes, done){
        migration.addColumn('Users', 'hasMMXApp', {
            type         : DataTypes.BOOLEAN,
            defaultValue : false
        });
        done();
    },
    down : function(migration, DataTypes, done){
        migration.removeColumn('Users', 'hasMMXApp');
        done();
    }
}