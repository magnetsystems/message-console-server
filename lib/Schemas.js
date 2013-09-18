function Schemas(){
    var Schema = mongoose.Schema;
    
    this.schemas = {};
    this.properties = {};
    
    this.properties['User'] = {
        firstName : {
            'type'     : String,
            'required' : true
        },
        lastName : {
            'type'     : String,
            'required' : true
        },
        userName : {
            'type'     : String,
            'required' : true
        },
        email : {
            'type'      : String,
            'lowercase' : true,
            'required'  : true
        },
        dateAcceptedEULA : {
            'type' : Date
        },
        password : {
            'type' : String
        },
        country  : {
            'type' : String
        },
        company  : {
            'type' : String
        },
        userTypes : {
            'type'     : [String],
            'required' : true
        },
        tracking : {
            created : {
                'type' : Date
            },
            lastseen  : {
                'type' : Date
            },
            logins : {
                'type' : Number
            }
        },
        credentials : {
            'type' : [Number]
        }
    }
    this.schemas['User'] = new Schema(this.properties['User']);

    this.properties['Credentials'] = {
        users : [Number],
        MCID : {
            'type'     : String,
            'required' : true
        },
        AWSAccessKey : {
            'type'     : String,
            'required' : true
        },
        AWSSecretKey : {
            'type'     : String,
            'required' : true
        },
        AWSBucketName : {
            'type'     : String,
            'required' : true
        },
        AWSFolderName : {
            'type'     : String,
            'required' : true
        }
    }
    this.schemas['Credentials'] = new Schema(this.properties['Credentials']);

    this.properties['Project'] = {
        user        : Number,
        createdDate : Date,
        name        : String,
        description : String,
        properties  : [Schema.Types.Mixed]
    }
    this.schemas['Project'] = new Schema(this.properties['Project']);

    return this;
}

/* get the schema of an entity */
Schemas.prototype.get = function(entity){
    console.log('Schemas: getting schema for entity: ' + entity);
    return this.schemas[entity];
}

/* get the properties of an entity */
Schemas.prototype.getProperties = function(entity){
    console.log('Schemas: getting properties for entity: ' + entity);
    return this.properties[entity];
}

module.exports = new Schemas();