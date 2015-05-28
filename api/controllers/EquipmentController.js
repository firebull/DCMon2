/**
 * EquipmentController
 *
 * @description :: Server-side logic for managing Equipment
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var util   = require('util');
var moment = require('moment');

module.exports = {
	monitor: function(req, res){

        return res.view({'url': req.url});

    },

    graphs: function(req, res){
        var ip     = require('ip').toLong;
        var from, to;

        var influxClient = sails.influxClient;

        Equipment.findOne({'id': req.params.id}).exec(function(err, eq){
            if (err){
                sails.logger.error('Could not get equipment ID %s: %s', req.params.id, err);
                return res.json();
            } else {

                // Prepare From/To period params for request
                if (req.body && req.body.from !== undefined){
                    from = moment(req.body.from).unix();
                } else {
                    from = moment().subtract(2, 'hours').unix();
                }

                if (req.body && req.body.to !== undefined){
                    to = moment(req.body.to).unix();
                } else {
                    to = moment().unix();
                }

                // Check if To more then From =))
                if (to < from){
                    to = moment(from).add(2, 'hours').unix();
                } else if (to > moment().unix()){
                    to = moment().unix();
                }

                // Count distinct period
                var minutesDiff  = moment(to, 'X').diff(moment(from, 'X'), 'minutes');
                var distinctTime = parseInt(minutesDiff/100);

                var query = util.format("SELECT DISTINCT(value) AS value FROM /^ip%s\./i WHERE time > %ss group by time(%sm) ORDER ASC", ip(eq.address), from, distinctTime);
                influxClient.query(query, function(err, data){
                    return res.json({sensors: data});
                });
            }
        });
    },

    events: function(req, res){
        var from = moment().subtract(2, 'hours').toJSON(), // Search from datetime
            to   = moment().toJSON(),                       // Search to datetime
            by   = 'all', // Search by @field, may be: 'all', 'dc', 'rack', 'host'
            param,        // Search by param, for eaxmple 192.168.0.50
            offset = 0,   // Search offset, in elastic it is 'from'
            limit  = 100, // Search limit, in elastic it is 'size'
            levels = ['emerg', 'alert', 'crit', 'warn', 'error'], // Array of log levels
            query = {};

        if (req.body){

            // Prepare From/To period params for request
            if (req.body.from !== undefined){
                from = moment(req.body.from).toJSON();
            }

            if (req.body.to !== undefined){
                to = moment(req.body.to).toJSON();
            }

            if (req.body.by !== undefined && req.body.param !== undefined){
                by = req.body.by;
                param = req.body.param;
            }

            if (req.body.limit !== undefined){
                limit = req.body.limit;
            }

            if (req.body.levels !== undefined){
                levels = req.body.levels;

            }
        }

        // Check if To more then From =))
        if (moment(to).diff(moment(from)) < 0){
            to = moment(from).add(2, 'hours').toJSON();
        } else if (moment(to).unix() > moment().unix()){
            to = moment().toJSON();
        }

        // Request logs by offset and limit only if now date requested
        if (!req.body || (req.body.from === undefined && req.body.to === undefined)){
            query.filtered = {
                                filter: {
                                        bool: {
                                                must:[

                                                      { exists : { field : "@timestamp" }}
                                                    ]
                                            }
                                    }
                            };
        } else {
        // Request logs in timestamp range
            query.filtered = {
                                filter: {
                                        bool: {
                                                must:[
                                                      { range: {
                                                                    "@timestamp" : {
                                                                        gt : from,
                                                                        lt : to
                                                                    }
                                                                }},
                                                      { exists : { field : "@timestamp" }}
                                                    ]
                                            }
                                    }
                            };
        }

        if (by == 'dc') {
            query.filtered.query =  {
                                        multi_match: {
                                                    query:  param,
                                                    type:   "cross_fields",
                                                    fields: [ "@fields.dc"]
                                                    }
                                    };
        } else if (by == 'rack') {
            query.filtered.query =  {
                                        multi_match: {
                                                    query:  Number(param),
                                                    type:   "cross_fields",
                                                    fields: [ "@fields.rack"]
                                                    }
                                    };
        } else if (by == 'host') {
            query.filtered.query =  {
                                        multi_match: {
                                                    query:  param,
                                                    type:   "cross_fields",
                                                    fields: [ "@fields.host"]
                                                    }
                                    };
        }

        async.waterfall([
                // We need to check if any of logs exists as
                // Elastic throws an exception trying to sort null results
                function(callback){
                    sails.elastic.searchExists({    index: 'logs',
                                                    type: levels,
                                                    from: offset,
                                                    size: limit,
                                                    lenient: true,
                                                    body: {query: query}},
                                            function (err, results){
                                                //console.log(query.filtered);
                                                    callback(err, results.exists);
                                                });
                },
                function(exists, callback){
                    if (exists){
                        sails.elastic.search({  index: 'logs',
                                                type: levels,
                                                from: offset,
                                                size: limit,
                                                lenient: true,
                                                sort: ['@timestamp:desc'],
                                                body: {query: query}},
                                        function (err, results){

                                                if (err && err.length > 0){
                                                    return res.json({url: req.url, error: err});
                                                } else {
                                                    var data  = {total: results.hits.total};
                                                    data.hits = results.hits.hits;

                                                    return res.json({url: req.url, result: data});
                                                }
                                            });
                    } else {
                        return res.json({url: req.url, result: {total: 0}});
                    }
                }

            ], function(err){
                //console.log(query.filtered);
                return res.json({url: req.url, result: {total: 0}});
            });
    },

    getCommonStatus: function(req, res){
        async.series({
                        events: function(callback){
                            Equipment.query('SELECT count(*) AS `num`, `event_status` AS `status` FROM `equipment` WHERE `monitoring_enable` = true GROUP BY `event_status`',
                                function(err, result){
                                    callback(err, result);
                                });
                        },
                        sensors: function(callback){
                            Equipment.query('SELECT count(*) AS `num`, `sensor_status`AS `status` FROM `equipment` WHERE `monitoring_enable` = true GROUP BY `sensor_status`',
                                function(err, result){
                                    callback(err, result);
                                });
                        },
                        power: function(callback){
                            Equipment.query('SELECT count(*) AS `num`, `power_state` AS `status` FROM `equipment` WHERE `monitoring_enable` = true GROUP BY `power_state`',
                                function(err, result){
                                    callback(err, result);
                                });
                        }
                   },
                   function(err, results){
                        if (err){
                            return res.json({url: req.url, result: results, error: err});
                        } else {
                            return res.json({url: req.url, result: results});
                        }
                   }
                );
    },

    testQuery: function(req, res){

        QueryService.queryEqs(function(err, result){
            return res.json({url: req.url, data: result});
        });
    }
};

