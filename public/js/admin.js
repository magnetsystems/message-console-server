
require.config({
  paths : {
      "modernizr"     : "libs/modernizr",
      "jquery"        : "libs/jquery",
      "json2"         : "libs/json2",
      "underscore"    : "libs/underscore",
      "backbone"      : "libs/backbone",
      "scrollto"      : "libs/scrollto",
      "bootstrap"     : "libs/bootstrap",
      "resources"     : "libs/resources",
      "placeholder"   : "libs/placeholder"
  },
  shim : {
      "resources"  : {
          "deps"    : ["backbone", "jquery"]
      },
      "backbone"  : {
          "deps"    : ["underscore", "jquery", "scrollto", "bootstrap"],
          "exports" : "Backbone" 
      },
      "scrollto"  : {
          "deps"    : ["jquery"]
      },
      "bootstrap"  : {
          "deps"    : ["jquery"]
      }
  } 
});
require(['modernizr', 'jquery', 'backbone', 'routers/adminRouter', 'resources', 'scrollto', 'bootstrap', 'placeholder'], function(Modernizr, $, Backbone, Desktop){
    $('#loadingBar').hide();
    // create new desktop instance
    this.router = new Desktop();
});