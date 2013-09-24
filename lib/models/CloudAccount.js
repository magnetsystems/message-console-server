/**
 * Created with JetBrains WebStorm.
 * User: pshah
 * Date: 9/24/13
 * Time: 2:34 PM
 * To change this template use File | Settings | File Templates.
 */

var orm = require('../orm')
    , Seq = orm.Seq();

module.exports = {
    model : {
        magnetId : {
            type: Seq.STRING,
            validate: { isUUID: 1 }
        },
        ownerId : {
            type: Seq.STRING,
            validate: { isUUID: 1 }
        },
        ownerType : {
            type: Seq.ENUM('User', 'Team') // Who owns the account?
        },
        name : {
            type: Seq.STRING
        },
        provider: {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        bucketName: {
            type: Seq.STRING,
            validate: { isUUID: 1 }
        },
        accessKeyId: {
            type: Seq.STRING,
            validate: { notEmpty: true }
        },
        secretAccessKey: {
            type: Seq.STRING,
            validate: { notEmpty: true }
        }
    },
    relations : {
        //hasMany : "World"
    },
    options : {
        //freezeTableName : true
    }
};
