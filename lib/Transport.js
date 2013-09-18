var http = require("http")
, https = require("https");

var Transport = function(){
    return this;
}

/* TRANSPORT */

var options = {
    host: 'somesite.com',
    port: 443,
    path: '/some/path',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

var APIKEYS = {
    GOOGLE : 'AIzaSyCSPQemjylRokYZ4xyp5p_J_otxOk_B7B8'
}

// get google location information
Transport.prototype.getGoogleGeocoding = function(data, callback){
    var body = data.address;
    if(typeof body === typeof ''){
        var options = {
            host : 'maps.googleapis.com',
            port : 80,
            path : '/maps/api/geocode/json?address='+encodeURIComponent(body)+'&sensor=false',
            method : 'GET',
            headers : {
                'Content-Type': 'application/json'
            }
        };
        obj = tmpMapSearch;
        //this.request(options, function(e, obj){
            if(obj){
                var results = [];
                for(var i in obj.results){
                    results.push({
                        name    : obj.results[i].address_components[0].long_name,
                        addr    : obj.results[i].formatted_address,
                        latlong : obj.results[i].geometry.location
                    });
                }
                callback(null, results);
            }else{
                callback('request-error');
            }
        //});
    }
}

// get google place information
Transport.prototype.getGooglePlace = function(data, callback){
    var loc = data.latlong.lat+','+data.latlong.lng;
    var query = data.query;
    if(typeof query === typeof '' && typeof loc === typeof ''){
        var options = {
            host : 'maps.googleapis.com',
            port : 80,
            path : '/maps/api/place/search/json?location='+encodeURIComponent(loc)+'&radius=50000&keyword='+encodeURIComponent(query)+'&sensor=false&key='+APIKEYS.GOOGLE,
            method : 'GET',
            headers : {
                'Content-Type': 'application/json'
            }
        };
        obj = tmpPlace;
        //this.request(options, function(e, obj){
            if(obj){
                var results = [];
                for(var i in obj.results){
                    results.push({
                        latlong  : obj.results[i].geometry.location,
                        icon     : obj.results[i].icon,
                        id       : obj.results[i].id,
                        name     : obj.results[i].name,
                        rating   : obj.results[i].rating,
                        types    : obj.results[i].types.join(', '),
                        vicinity : obj.results[i].vicinity
                    });
                }
                callback(null, results);
            }else{
                callback('request-error');
            }
        //});
    }
}
//http://maps.googleapis.com/maps/api/distancematrix/json?key=AIzaSyCSPQemjylRokYZ4xyp5p_J_otxOk_B7B8&origins=cupertino&destinations=sunnyvale|milpitas|fremont
// get google distances between multiple points
Transport.prototype.getGooglePlaceDistances = function(data, callback){
    var origin = data.places[0];
    data.places.splice(0,1);
    var destinations = data.places.join('|');
    console.log('/maps/api/distancematrix/json?origins='+origin+'&destinations='+destinations+'&sensor=false');
    if(destinations.length){
        var options = {
            host : 'maps.googleapis.com',
            port : 80,
            path : '/maps/api/distancematrix/json?origins='+origin+'&destinations='+destinations+'&sensor=false&units=imperial',
            method : 'GET'
        };
        //obj = tmpMapSearch;
        this.request(options, function(e, obj){
            console.log('got');
            console.log(e, obj);
            if(obj){
                var results = [];
                for(var i in obj.rows){
                    results.push({
                        latlong  : obj.results[i].geometry.location,
                        icon     : obj.results[i].icon,
                        id       : obj.results[i].id,
                        name     : obj.results[i].name,
                        rating   : obj.results[i].rating,
                        types    : obj.results[i].types.join(', '),
                        vicinity : obj.results[i].vicinity
                    });
                }
                callback(null, obj);
            }else{
                console.log(e);
                callback('request-error');
            }
        });
    }
}

// general HTTP request
Transport.prototype.request = function(options, callback){
	console.log('Tracking: performing external request to: ' + options.method + ' ' + options.host+options.path);
    var prot = options.port == 443 ? https : http;
    var req = prot.request(options, function(res){
        var output = '';
        console.log(options.host + ':' + res.statusCode);
        console.log('Tracking: received external response: ' + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            output += chunk;
        });
        res.on('end', function(){
            var obj = JSON.parse(output);
            callback(null, obj);
        });
    });
    req.on('error', function(err){
        console.log('Tracking: received external response: ' + err);
        callback(err);
    });
    req.end();
}

var tmpMapSearch = {
   "results" : [
      {
         "address_components" : [
            {
               "long_name" : "Santa Catalina Island",
               "short_name" : "Santa Catalina Island",
               "types" : [ "natural_feature", "establishment" ]
            },
            {
               "long_name" : "Los Angeles",
               "short_name" : "Los Angeles",
               "types" : [ "administrative_area_level_2", "political" ]
            },
            {
               "long_name" : "California",
               "short_name" : "CA",
               "types" : [ "administrative_area_level_1", "political" ]
            },
            {
               "long_name" : "United States",
               "short_name" : "US",
               "types" : [ "country", "political" ]
            },
            {
               "long_name" : "90704",
               "short_name" : "90704",
               "types" : [ "postal_code" ]
            }
         ],
         "formatted_address" : "Santa Catalina Island, California 90704, USA",
         "geometry" : {
            "bounds" : {
               "northeast" : {
                  "lat" : 33.4785610,
                  "lng" : -118.29917110
               },
               "southwest" : {
                  "lat" : 33.3009110,
                  "lng" : -118.6032490
               }
            },
            "location" : {
               "lat" : 33.38788560,
               "lng" : -118.41631030
            },
            "location_type" : "APPROXIMATE",
            "viewport" : {
               "northeast" : {
                  "lat" : 33.4785610,
                  "lng" : -118.29917110
               },
               "southwest" : {
                  "lat" : 33.3009110,
                  "lng" : -118.6032490
               }
            }
         },
         "types" : [ "natural_feature", "establishment" ]
      }
   ],
   "status" : "OK"
}


var tmpPlace = {
   "html_attributions" : [],
   "results" : [
      {
         "geometry" : {
            "location" : {
               "lat" : 33.3430750,
               "lng" : -118.3234590
            }
         },
         "icon" : "http://maps.gstatic.com/mapfiles/place_api/icons/generic_business-71.png",
         "id" : "cf63f4c8dd56c67c63547f33df8c0752c7f259a9",
         "name" : "Parasailing Catalina",
         "opening_hours" : {
            "open_now" : true
         },
         "rating" : 3.70,
         "reference" : "CoQBcgAAAPwv0fHfSFJCCa7x4738U2qm_QURXxyHzkxviIBOteSHsNQTTCVLt1TS2d8evEYhVHwHGoHwtYwImYCb2dcjjjtEIxGp4ftfiQI7MXnreUGxhJ0qKP0BIDEPUSx9cbc54BUKnmp3ftZIyIrYx1f9nulJf_1eklBCrae14d6jnnT2EhAnNzaLpL6aJzTn5jddbirIGhSKrlCVtxS3QYmd4HETW1nF05nyeA",
         "types" : [ "establishment" ],
         "vicinity" : "105 Pebbly Beach Road, Avalon"
      },
      {
         "geometry" : {
            "location" : {
               "lat" : 33.6035870,
               "lng" : -117.9003650
            }
         },
         "icon" : "http://maps.gstatic.com/mapfiles/place_api/icons/generic_business-71.png",
         "id" : "58a4464e71550831097fff1ec6db0577bd365f4a",
         "name" : "Balboa Boat Rentals",
         "opening_hours" : {
            "open_now" : false
         },
         "reference" : "CoQBcgAAALpz_IazEUwgcO9YbOUqpVkoWcysGnN82Cudm3sCeTubbrDVntdiNPWahDtSIdvrDeDALybHMmFH2ZA8tljdO5dmExCXrpnjIrAq0sAR6CFYNMQ5OH7yo_GiBQ_JlqyQMclsgZkge12jbzJ_j6l-YjwXGcx_7clvsnbnZV5nsDVsEhDjJZgB8HvSKGUcEPilDYMYGhR1gjASsejHFXH1JIzbsL47PlnWrw",
         "types" : [ "establishment" ],
         "vicinity" : "510 East Edgewater Avenue, Newport Beach"
      }
   ],
   "status" : "OK"
}



module.exports = new Transport();