
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
      "fileuploader"  : "libs/fileuploader",
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
      },
      "fileuploader"  : {
          "deps"    : ["jquery"]
      }
  }
});
require(['modernizr', 'jquery', 'backbone', 'routers/desktopRouter', 'resources', 'scrollto', 'bootstrap', 'fileuploader', 'placeholder'], function(Modernizr, $, Backbone, Desktop){
    $('#loadingBar').hide();
    // create new desktop instance
    this.router = new Desktop();
});