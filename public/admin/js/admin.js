
require.config({
  paths : {
      "modernizr"      : "libs/modernizr",
      "jquery"         : "libs/jquery",
      "json2"          : "libs/json2",
      "underscore"     : "libs/underscore",
      "backbone"       : "libs/backbone",
      "scrollto"       : "libs/scrollto",
      "bootstrap"      : "libs/bootstrap.min",
      "resources"      : "libs/resources",
      "fuelux"         : "libs/fuelux.min",
      "moment"         : "libs/moment",
      "placeholder"    : "libs/placeholder",
      "iframe"         : "libs/iframe",
      "ace"            : "libs/ace"
  },
  shim : {
      "resources"  : {
          "deps"    : ["backbone", "jquery"]
      },
      "iframe" : {
          "deps" : ["jquery"]
      },
      "backbone"  : {
          "deps"    : ["underscore", "jquery", "scrollto", "bootstrap"],
          "exports" : "Backbone"
      },
      "fuelux"  : {
          "deps"    : ["bootstrap", "jquery", "moment"]
      },
      "scrollto"  : {
          "deps"    : ["jquery"]
      },
      "bootstrap"  : {
          "deps"    : ["jquery"]
      }
  } 
});
require(['modernizr', 'jquery', 'backbone', 'routers/adminRouter', 'resources', 'scrollto', 'bootstrap', 'placeholder', 'fuelux', 'iframe', 'ace'], function(Modernizr, $, Backbone, Admin){
    $('#loadingBar').hide();
    this.router = new Admin();
});