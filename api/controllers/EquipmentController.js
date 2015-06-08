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

	/**
	 * Get simple list of equipments
	 * Just ID, name, type, address, pos_in_rack, rack
	 * @return {Array}     Array of objects
	 */
	simpleList: function(req, res){
		Equipment.find({select: ['id', 'name', 'description', 'address', 'pos_in_rack', 'rackmount'],
		                sort: {rackmount: 1, pos_in_rack: 1}})
				.populate('rackmount')
				.exec(function(err, eqs){
					if (err){
						sails.logger.error('Could not get equipment list: %s', err);
						return res.serverError();
					} else {
						// Group By Rack
						var groupedEqs = [];
						var rack = {rackmount: eqs[0].rackmount, eqs: []};
						var lastRack = eqs[0].rackmount.id;
						var currRack;

						_.forEach(eqs, function(eq){
							currRack = eq.rackmount;
							delete(eq.rackmount);
							
							rack.eqs.push(eq);

							if (currRack.id != lastRack){
								groupedEqs.push(rack);
								lastRack = currRack.id;
								rack = {rackmount: currRack, eqs: []};
							}
						});

						groupedEqs.push(rack);

						return res.ok(groupedEqs);
					}
				});
	},

    graphs: function(req, res){
        var ip     = require('ip').toLong;
		var XRegExp = require('xregexp').XRegExp;
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
					if (err){
						return res.serverError();
					} else {
						_.forEach(data, function(item){
							item.name = XRegExp.split(item.name, /\./g)[1];
						});
						return res.ok(data);
					}
                });
            }
        });
    },

	/**
	 * Get last data of sensors for eq
	 * @return {Object} sensor names with their last values
	 */
	lastSensorsData: function(req, res){
		var ip      = require('ip').toLong;
		var XRegExp = require('xregexp').XRegExp;
        var storeName;
		var lastData = {};

        var influxClient = sails.influxClient;

        Equipment.findOne({'id': req.params.id}).exec(function(err, eq){
            if (err){
                sails.logger.error('Could not get equipment ID %s: %s', req.params.id, err);
                return res.json();
            } else {

				var query = util.format("SELECT value FROM /^ip%s\./i LIMIT 1", ip(eq.address));
                influxClient.query(query, function(err, data){
					if (err){
						return res.serverError();
					} else {
						_.forEach(data, function(item){

							storeName = XRegExp.split(item.name, /\./g)[1];
							lastData[storeName] = item.points[0][2];
						});

						return res.ok(lastData);
					}

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
                                                    query:  Number(param),
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

	// 1) Query all not confirmed logs by query and confirm them
	// 2) Set states to OK
	resetState: function(req, res){
		if (req.params.id){
			Equipment.findOne({id: req.params.id}).exec(function(err, eq){
				if (err){
					return res.badRequest();
				}

				var query = {};

				query.filtered = {
	                                filter: {
	                                        bool: {
	                                                must:[
															{ exists : { field : "confirmed" }},
															{ term   : { '@fields.host': eq.address}}
													]
	                                        }
	                                },
									query:  {
		                                        match: {
															confirmed:  false
														}

		                                    }
	                            };


				async.waterfall([
		                function(callback){
	                        sails.elastic.search({  index: 'logs',
	                                                lenient: true,
													fields: ['id', 'type'],
													size: 1000,
	                                                body: {query: query}},
	                                        function (err, results){
	                                                if (err && err.length > 0){
	                                                    callback(err);
	                                                } else {
	                                                    callback(null, results);
	                                                }
	                                            });
		                },
						function(results, callback){
							if (results.hits && results.hits.total > 0){
								async.each(results.hits.hits, function(hit, eachCallback) {
									sails.elastic.update({
							                                index: 'logs',
							                                type:  hit._type,
							                                id:    hit._id,
							                                body: {
							                                    doc: {
							                                      confirmed: true,
							                                      confirmerId: res.locals.user.id,

							                                      // Let's save confimer login for history
							                                      // in case he will be deleted later
							                                      confirmerName: res.locals.user.username,
							                                    }
							                                }
							                            }, function (err, response) {
							                                if (err){
																eachCallback(err);
							                                } else {
																eachCallback(null);
							                                }
							                            });
								}, function(err){
								    if( err ) {
								        callback(err);
								    } else {
										callback(null);
								    }
								});

							} else {
								callback(null);
							}
						},
						function(callback){
							// If there were no errors in Async calls,
							// update equipment states
							Equipment.update({id: req.params.id},
											 {event_status: 'ok', sensor_status: 'ok'}
										).exec(function(err, result){
											if (err){
												callback(err);
											} else {
												sails.sockets.blast('statusUpdates', { message: 'eventsUpdated' });
												Equipment.publishUpdate(result[0].id, { sensor_status: result[0].sensor_status,
													                                    event_status:  result[0].event_status,
																						updatedAt:     result[0].updatedAt});
												callback(null);
											}
										});

						}
		            ], function(err){
						if (err){
							sails.logger.error('Could not mark events as confimed for eq #%s. Elasticsearch error: %s', req.params.id, err);
		                	return res.serverError();
						} else {
							return res.ok();
						}
		            });
			});
		} else {
			return res.badRequest();
		}
	},

    testQuery: function(req, res){

        QueryService.queryEqs(function(err, result){
            return res.json({url: req.url, data: result});
        });
    }
};
