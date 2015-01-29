
require.config({
    paths : {
        "modernizr"      : "libs/modernizr",
        "jquery"         : "libs/jquery",
        "json2"          : "libs/json2",
        "underscore"     : "libs/underscore",
        "backbone"       : "libs/backbone",
        "fuelux"         : "libs/fuelux.min",
        "moment"         : "libs/moment",
        "bootstrap"      : "libs/bootstrap.min",
        "resources"      : "libs/resources"
    },
    shim : {
        "resources"  : {
            "deps"    : ["backbone", "jquery"]
        },
        "fuelux"  : {
            "deps"    : ["moment", "bootstrap", "jquery"]
        },
        "backbone"  : {
            "deps"    : ["underscore", "jquery", "bootstrap"],
            "exports" : "Backbone"
        },
        "bootstrap"  : {
            "deps"    : ["jquery"]
        }
    }
});
require(['modernizr', 'jquery', 'backbone', 'routers/wizardRouter', 'resources', 'bootstrap', 'fuelux'], function(Modernizr, $, Backbone, Wizard){
    $('#loadingBar').hide();
    this.router = new Wizard();
});