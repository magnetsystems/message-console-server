var ElasticSearchClient = require('elasticsearchclient')
, validator = require('validator')
, fs = require('fs');

var elasticSearchClient = new ElasticSearchClient(ENV_CONFIG.ElasticSearchOptions);

var targetPath = 'public/docs';
var contains = /.htm/i;
var searchIndex = 'magnetsearch';
var searchType = 'document';

var FullTextSearch = function(){};

// index all of the HTML documentation
FullTextSearch.prototype.index = function(callback){
    var me = this;
    this.traverse(targetPath, function(e, results){
        if(e){
            winston.error('ElasticSearch: traversal - ', e);
        }else{
            me.createIndex(function(e){
                if(e){
                    callback(e);
                }else{
                    elasticSearchClient.bulk(results, {}) .on('data', function(){
                        winston.info('FullTextSearch: completed indexing.');
                        if(typeof callback === typeof Function) callback();
                    }).on('error', function(e){
                        winston.error('ElasticSearch: bulk store - ', e);
                        if(typeof callback === typeof Function) callback(null);
                    }).exec();
                }
            });
        }
    });
};

// create an index identity on the ElasticSearch server
FullTextSearch.prototype.createIndex = function(callback){
    elasticSearchClient.createIndex(searchIndex, {}, {}).on('data', function(data){
        callback(null);
    }).on('error', function(e){
        winston.error('ElasticSearch: createIndex - ', e);
        callback('indexing-error');
    }).exec();
};

// delete an index identity on the ElasticSearch server
FullTextSearch.prototype.clear = function(callback){
    var me = this;
    elasticSearchClient.deleteIndex(searchIndex, function(e){
        if(e){
            winston.error('ElasticSearch: clear indexes - ', e);
            callback('server-error');
        }else{
            me.createIndex(callback);
        }
    });
};

// recursively loop through documents directory and execute readToStore
FullTextSearch.prototype.traverse = function(dir, done){
    var results = [];
    var me = this;
    fs.readdir(dir, function(e, list){
        if(e) return done(e);
        var pending = list.length;
        if(!pending) return done(null, results);
        list.forEach(function(filename){
            var path = dir + '/' + filename;
            fs.stat(path, function(err, stat){
                if(stat && stat.isDirectory()){
                    me.traverse(path, function(err, res){
                        if(isValidArray(res)) results = results.concat(res);
                        if(!--pending) done(null, results);
                    });
                }else{
                    if(contains.test(path)){
                        me.readToStore(results, path, function(){
                            if(!--pending) done(null, results);
                        });
                    }else{
                        if(!--pending) done(null, results);
                    }
                }
            });
        });
    });
};

// read a file from the given path and add a record to the bulk command
FullTextSearch.prototype.readToStore = function(results, filepath, callback){
    fs.readFile(filepath, 'utf8', function(e, data){
        if(e){
            return callback(e);
        }else{
            var cleanPath = filepath.slice(6);
            var title = /<title>(.*?)<\/title>/g.exec(data);
            var paragraph = /<p>(.*?)<\/p>/g.exec(data);
            paragraph = isValidArray(paragraph) ? paragraph[1] : title;
            results.push({
                'index' : {
                    '_index' : searchIndex,
                    '_type'  : searchType,
                    '_id'    : cleanPath
                }
            });
            results.push({
                name  : isValidArray(title) ? title[1] : cleanPath,
                text  : data.replace(/<(?:.|\n)*?>/gm, '').replace(/\n/gm, ' '),
                brief : [paragraph.replace(/<(?:.|\n)*?>/gm, '').replace(/\n/gm, ' '), paragraph.replace(/<(?:.|\n)*?>/gm, '').replace(/\n/gm, ' ')]
            });
            callback(null);
        }
    });
};

// basic search
FullTextSearch.prototype.search = function(str, from, size, callback){
    if(!str){
        callback('missing-query');
    }else{
        from = isNumeric(from) ? (from - 1) : 0;
        size = isNumeric(size) ? size : 10;
        var defaultHL = {
            'fragment_size'       : 150,
            'number_of_fragments' : 3,
            'pre_tags'            : ['<em>'],
            'post_tags'           : ['</em>']
        };
        var queryObj = {
            'query'  : {
                'query_string' : {
                    'query'  : '*'+stripChars(str)+'*', // wildcard matching - not scalable. See ngram index settings below.
                    'fields' : ['name', 'text', 'id']
                }
            },
            'from'   : from,
            'size'   : size,
            'fields' : ['name', 'id', 'brief'],
            'highlight' : {
                'order'  : 'score',
                'fields' : {
                    'name' : defaultHL,
                    'text' : defaultHL
                }
            }
        };
        elasticSearchClient.search(searchIndex, searchType, queryObj).on('data', function(res){
            callback(null, res);
        }).on('error', function(e){
            winston.error('ElasticSearch: search error - ', e);
            callback('server-error');
        }) .exec();
    }
};

function isValidArray(val){
    return Object.prototype.toString.call(val) === '[object Array]' && val.length > 0;
}

function stripChars(str){
    return String(str).replace(/[^a-zA-Z0-9 _-]/g,'');
}

function isNumeric(obj){
    obj = typeof(obj) === 'string' ? obj.replace(',', '.') : obj;
    return !isNaN(parseFloat(obj)) && isFinite(obj) && Object.prototype.toString.call(obj).toLowerCase() !== '[object array]';
}

// ngram index settings - using ngrams to create an index takes several minutes and doubles database size.
// However, this is a more scalable solution for searching within a word and supporting lowercase matching.
var indexSettings = {
    'mappings': {
        'document': {
            'properties': {
                'name': {
                    'type': 'string',
                    'index_analyzer': 'index_ngram',
                    'search_analyzer': 'search_ngram'
                },
                'text': {
                    'type': 'string',
                    'index_analyzer': 'index_ngram',
                    'search_analyzer': 'search_ngram'
                }
            }
        }
    },
    'settings': {
        'analysis': {
            'filter': {
                'name_ngram': {
                    'type': 'ngram',
                    'min_gram': 4,
                    'max_gram': 8
                },
                'text_ngram': {
                    'type': 'ngram',
                    'min_gram': 4,
                    'max_gram': 8
                }
            },
            'analyzer': {
                'index_ngram': {
                    'type': 'custom',
                    'tokenizer': 'keyword',
                    'filter': [ 'name_ngram', 'text_ngram', 'lowercase' ]
                },
                'search_ngram': {
                    'type': 'custom',
                    'tokenizer': 'keyword',
                    'filter': 'lowercase'
                }
            }
        }
    }
}

module.exports = new FullTextSearch();