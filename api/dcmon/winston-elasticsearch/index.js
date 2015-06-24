var util        = require('util');
var winston     = require('winston');
var cluster     =  require('cluster');
var _basename   = require('path').basename;
var _dirname    = require('path').dirname;
var xtend       = require('xtend');
var crypto      = require('crypto');
var moment      = require('moment');

/**
 * Constructor
 *
 *
 */
var Elasticsearch = module.exports = winston.transports.Elasticsearch = function Elasticsearch( options ) {

    options = options || {};

    // Enforce context
    if (!(this instanceof Elasticsearch)) {
      return new Elasticsearch(options);
    }

    // Set defaults
    this.level = options.level || 'info';
    this.indexName = options.indexName || 'logs';
    this.fireAndForget = !!options.fireAndForget;

    // Only set typeName if provided, otherwise we will use "level" for types.
    this.typeName = options.typeName || null;

    // Could get more sexy and grab the name from the parent's package.
    this.source = options.source || _dirname(process.mainModule.filename) || module.filename;

    // Automatically added entry fields
    this.disable_fields = options.disable_fields || false;

    // Set client and bail if ready
    if (options.client) {
        this.client = options.client;
        return this;
    }

    // Return for good measure.

    return this;

};

util.inherits( Elasticsearch, winston.Transport );


/**
 * Handle Log Entries
 *
 *
 */
Elasticsearch.prototype.log = function log( level, msg, meta, callback ) {

    var self = this;
    var args = Array.prototype.slice.call( arguments, 0 );

    // Not sure if Winston always passed a callback and regulates number of args, but we are on the safe side here
    callback = 'function' === typeof args[ args.length - 1 ] ? args[ args.length - 1 ] : function fallback() {};

    // Using some Logstash naming conventions. (https://gist.github.com/jordansissel/2996677) with some useful variables for debugging.
    var entry = {
        level: level,
        confirmed: false,
        hash: crypto.createHash('md5').update(msg).digest('hex'),
        count: 1,
        '@source': self.source,
        '@message': msg
    };

    if (meta.timestamp){
        // We hope, that we get timestamp in ISO
        entry['@timestamp'] = meta.timestamp;
    } else {
        entry['@timestamp'] = new Date().toISOString();
    }

    delete(meta.timestamp);

    // Add auto-generated fields unless disabled
    if( !this.disable_fields ) {
        entry['@fields'] = {
            worker: cluster.isWorker,
            pid: process.pid,
            path: module.parent.filename,
            user: process.env.USER,
            main: process.mainModule.filename,
            uptime: process.uptime(),
            rss: process.memoryUsage().rss,
            heapTotal: process.memoryUsage().heapTotal,
            heapUsed: process.memoryUsage().heapUsed
        };
    }

    // Add tags only if they exist
    if( meta && meta.tags ) {
      entry['@tags'] = meta && meta.tags;
    }

    if( meta ) {
      entry['@fields'] = xtend(entry['@fields'], meta);
    }

    // First needa check for the same messages in last 30 minutes
    // and join them in last message to prevent of repeating too much

    async.waterfall([
        // Search for messages
        function(cb){

            var query = {};
            query.filtered = {
                                filter: {
                                  bool: {
                                    must: [{
                                      range: {
                                        "@timestamp": {
                                          gt: moment(entry['@timestamp']).subtract(30, 'minutes').toJSON(),
                                          lt: moment(entry['@timestamp']).toJSON()
                                        }
                                      }
                                    }, {
                                      exists: {
                                        field: "@timestamp"
                                      }
                                    }]
                                  }
                                },
                                query: {
                                  bool: {
                                    must: [{
                                      match: {
                                        hash: entry.hash
                                      }
                                    }]
                                  }
                                }
            };

            // Add Equipment ID to search query if exists
            if (!_.isEmpty(entry['@fields']) && entry['@fields'].eq > 0){
                query.filtered.query.bool.must.push( {
                    match: {"@fields.eq":  entry['@fields'].eq}
                });
            }

            sails.elastic.search({  index: 'logs',
                                    type: ['emerg', 'alert', 'crit', 'warn', 'error', 'info'],
                                    lenient: true,
                                    sort: ['@timestamp:desc'],
                                    fields: 'count',
                                    body: {query: query}},
                                function (err, results){

                                    if (err && err.length > 0){
                                        sails.log.error(err);
                                        return cb(err);
                                    } else {
                                        var ids = []; // Ids of messages to delete later
                                        if (results.hits !== undefined && results.hits.total > 0){
                                            _.forEach(results.hits.hits, function(hit){
                                                entry.count += parseInt(hit.fields.count[0]);
                                                ids.push(hit._id);
                                            });

                                            entry['@message'] = msg + util.format(' This message repeated %d times.', entry.count);
                                        }

                                        return cb(null, ids);
                                    }
                                });
        },
        // Delete old repeated messages
        function(ids, cb){
            if (cb.length > 0){
                var query = {
                              "ids": {
                                "values": ids
                              }
                            };

                sails.elastic.deleteByQuery({
                    index: 'logs',
                    body: { query: query}
                }, function(err, result){
                        if (err){
                            sails.log.error(err);
                            return cb(err);
                        } else {
                            return cb(null);
                        }
                    });
            } else {
                return cb(null);
            }
        }
    ], function(err){
        self.client.index({
            index: self.indexName,
            type: self.typeName || entry.level || 'log',
            body: entry
            }, function done( error, res ) {

                // If we are ignoring callbacks
                if( callback && self.fireAndForget ){
                    return callback( null );
                }

                if( callback ) {
                    return callback( error, res );
                }

        });
    });

    return this;

};
