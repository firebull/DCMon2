/**
 *  Main Service to query equipment through SNMP
 */

var XRegExp = require('xregexp').XRegExp;
var changeCase = require('change-case');
var snmp = require('snmp-native');
var util = require('util');
var moment = require('moment');

function snmpGet(host, oids, callback){
    // Create a Session with given host, port, and community.
    var session = new snmp.Session(host);
    var result = [];

    session.getAll({ oids: oids }, function (error, varbinds) {
        if (error){
            return callback(null);
        } else {
            varbinds.forEach(function (vb) {
                result.push(vb.value);
            });

            return callback(null, result);
        }
    });
}

function snmpTree(host, oid, callback){
    // Create a Session with given host, port, and community.
    var session = new snmp.Session(host);
    var result = {};

    session.getSubtree({ oid: oid }, function (error, varbinds) {
        if (error){
            return callback(null);
        } else {
            return callback(null, varbinds);
        }
    });
}

module.exports = {
    querySensors: function(equipment, callback){

        var host = {  host: equipment.address,
                      port: 161,
                      community: equipment.snmp_trap,
                      timeouts: [5000, 10000]};

        var oids, limits;

        async.parallel({
            // Get interfaces names
            names: function(cb){
                oids = '.1.3.6.1.2.1.2.2.1.2';
                snmpTree(host, oids, function(err, result){
                    var names = {};
                    var ifName, index;

                    if (err){
                        return cb(err);
                    } else {
                        if (result && result.length > 0){
                            result.forEach(function (vb) {
                                index = _.last(vb.oid)
                                names[index] = { index: index,
                                                 name: util.format('%s %s', ('00' + index).slice(-2), vb.value) };
                            });
                            return cb(null, names);
                        } else {
                            return cb('nodata');
                        }
                    }
                });
            },
            // Get interfaces speed
            speed: function(cb){
                oids = '.1.3.6.1.2.1.2.2.1.5';
                snmpTree(host, oids, function(err, result){
                    var speed = {};

                    if (err){
                        return cb(err);
                    } else {
                        if (result && result.length > 0){
                            result.forEach(function (vb) {
                                // Speed gonna be in Mbits in decimal, not Binary
                                // This is done to correctly display graphs
                                speed[_.last(vb.oid)]  = { min: 0, max: vb.value/1000000, units: 'Mbits'};
                            });
                            return cb(null, speed);
                        } else {
                            return cb('nodata');
                        }
                    }
                });
            },
            // Get interfaces IN bytes
            inBytes: function(cb){
                oids = '.1.3.6.1.2.1.2.2.1.10';
                snmpTree(host, oids, function(err, result){
                    var inBytes = {};

                    if (err){
                        return cb(err);
                    } else {
                        if (result && result.length > 0){
                            result.forEach(function (vb) {
                                // Speed gonna be in decimal, not Binary
                                // This is done to correctly display graphs
                                // And timestamp in seconds
                                inBytes[_.last(vb.oid)] = {in: vb.value, timestamp: vb.sendStamp/1000 };
                            });
                            return cb(null, inBytes);
                        } else {
                            return cb('nodata');
                        }
                    }
                });
            },
            // Get interfaces OUT bytes
            outBytes: function(cb){
                oids = '.1.3.6.1.2.1.2.2.1.16';
                snmpTree(host, oids, function(err, result){
                    var outBytes = {};

                    if (err){
                        return cb(err);
                    } else {
                        if (result && result.length > 0){
                            result.forEach(function (vb) {
                                // Speed gonna be in decimal, not Binary
                                // This is done to correctly display graphs
                                // And timestamp in seconds
                                outBytes[_.last(vb.oid)] = {out: vb.value, timestamp: vb.sendStamp/1000 };
                            });
                            return cb(null, outBytes);
                        } else {
                            return cb('nodata');
                        }
                    }
                });
            },
        }, function(err, results){
            if (err){
                if (err == 'nodata'){
                    return callback(null);
                } else {
                    return callback(err);
                }
            }

            var interfaces = _.merge(results.names, results.speed);
            var bytesTotal = _.merge(results.inBytes, results.outBytes);

            var elasticId = util.format('%s_%s_in_out_bytes', equipment.id, equipment.address);

            async.series({
                lastTotal: function(cb){
                    sails.elastic.get({
                        index: 'snmp',
                        type: 'lastdata',
                        id: elasticId
                    }, function (error, response) {
                        if (error){
                            cb(err);
                        } else {
                            if (response && response.found === true){
                                cb(null, response._source.data);
                            } else {
                                cb(null);
                            }
                        }
                    });
                },
                // Save current IN/OUT to elastic as we
                // need two points to count throughoutput
                saveTotal: function(cb){
                    sails.elastic.index({
                          index: 'snmp',
                          type: 'lastdata',
                          id: elasticId,
                          body: {
                            data: bytesTotal
                          }
                      }, function (error, result) {
                            if (error){
                                cb(err);
                            } else {
                                cb(null, result);
                            }
                        });
                }
            }, function(err, results){
                if (err){
                    callback(err);
                } else {
                    var result = [];
                    var currentUtilization;

                    // If we got past data - count stat
                    if (results.lastTotal){
                        var inMBits, outMBits, ifSpeed;

                        currentUtilization = _.merge(bytesTotal, results.lastTotal, function(current, last){

                            inMBits = (current.in - last.in)*8/((current.timestamp - last.timestamp)*1000000);
                            outMBits = (current.out - last.out)*8/((current.timestamp - last.timestamp)*1000000);

                            return {in: Number(Math.abs(inMBits).toFixed(2)), out: Number(Math.abs(outMBits).toFixed(2)), timestamp: current.timestamp};
                        });

                    }

                    var ifName, inName, outName, basicRules;
                    var limits  = {};
                    var sensors = [];

                    _.forEach(interfaces, function(item, index){
                        // We need to remove underscore as InfluxDB separates column by it
                        ifName = XRegExp.replace(changeCase.pascalCase(item.name), '_', '', 'all');

                        inName = ifName + '.In';
                        outName = ifName + '.Out';

                        basicRules = {
                            units: 'Mbits',
                            min: item.min,
                            max: item.max,
                            warnLimit: 2,
                            alertLimit: 1,
                            criticalSensor: false,
                            ignoreSensor: true
                        };

                        // Let's combine sensor limits from DB and parsed
                        if (equipment.sensors === 0 || equipment.sensors === undefined
                                || equipment.sensors.params === null || equipment.sensors.params[inName] === undefined){
                            /**
                                Related means query common data from both sensors
                                In main sensor related - is second sensor,
                                on other related = 'secondary'
                                If sensor is single - related = false
                             */

                            limits[inName] = _.clone(basicRules);
                            limits[inName].name = inName;
                            limits[inName].origName = item.name + ' Mbits';
                            limits[inName].ylabel = 'netIn';
                            limits[inName].related = outName;

                            limits[outName] = _.clone(basicRules);
                            limits[outName].name = outName;
                            limits[outName].origName = item.name + ' Out Mbits';
                            limits[outName].ylabel = 'netOut';
                            limits[outName].related = 'secondary';
                        } else {
                            limits[inName] = equipment.sensors.params[inName];
                            limits[outName] = equipment.sensors.params[outName];
                        }

                        if (currentUtilization && currentUtilization[index] !== undefined){
                            sensors.push({
                                name: ifName + '.In',
                                current: currentUtilization[index].in,
                                units: 'Mbits',
                                timestamp: currentUtilization[index].timestamp
                            });

                            sensors.push({
                                name: ifName + '.Out',
                                current: currentUtilization[index].out,
                                units: 'Mbits',
                                timestamp: currentUtilization[index].timestamp
                            });

                        }
                    });

                    result = {limits: limits, sensors: sensors};

                    callback(null, result);
                }
            });

        });

    },

    /**
     * Query alert sensors
     * For network devices by RFC I will get inetrfaces states
     * @param  {Object}   equipment data from DB
     * @param  {Function} callback
     * @return {Object}   to store data in Sensors Table
     */
    queryAlarmSensors: function(equipment, callback){
        var host = {  host: equipment.address,
                      port: 161,
                      community: equipment.snmp_trap,
                      timeouts: [5000, 10000]};

        var oids, limits;
        var timestamp = moment().unix();

        async.parallel({
            // Get interfaces names
            names: function(cb){
                oids = '.1.3.6.1.2.1.2.2.1.2';
                snmpTree(host, oids, function(err, result){
                    var names = {};
                    var ifName, index;

                    if (err){
                        return cb(err);
                    } else {
                        if (result && result.length > 0){
                            result.forEach(function (vb) {
                                index = _.last(vb.oid);
                                names[index] = { origName: util.format('%s %s Operational Status', ('00' + index).slice(-2), vb.value) };
                            });
                            return cb(null, names);
                        } else {
                            return cb('nodata');
                        }
                    }
                });
            },
            // Get current Interfaces states and check them
            intStates: function(cb){
                oids = '.1.3.6.1.2.1.2.2.1.8';
                snmpTree(host, oids, function(err, result){
                    var states = {1: 'up', 2: 'down', 3: 'testing', 4: 'unknown', 5: 'dormant', 6: 'notPresent', 7: 'lowerLayerDown'};
                    var ints = {};
                    var index;

                    if (err){
                        return cb(err);
                    } else {
                        if (result && result.length > 0){
                            result.forEach(function (vb) {
                                index = _.last(vb.oid);
                                ints[index] = {current: states[vb.value], timestamp: timestamp};
                            });
                            return cb(null, ints);
                        } else {
                            return cb('nodata');
                        }
                    }
                });
            }
        }, function(err, results){
            if (err){
                return callback(err);
            } else {
                var interfacesById = _.merge(results.names, results.intStates);
                var interfacesByName = {};
                var name;

                _.forEach(interfacesById, function(item){
                    name = changeCase.pascalCase(item.origName);
                    item.name = name;
                    item.type = 'ethernet';
                    interfacesByName[name] = item;
                });

                return callback(null, interfacesByName);
            }
        });
    },

    queryEvents: function(equipment, callback){

        return callback(null, []);
    },

    clearEvents: function(equipment, callback){

        return callback(null);
    },

    queryFullInfo: function(equipment, callback){
        var host = {  host: equipment.address,
                      port: 161,
                      community: equipment.snmp_trap,
                      timeouts: [5000, 10000]};

        var oids, limits;

        async.parallel({
            sysinfo: function(cb){
                oids = ['.1.3.6.1.2.1.1.1.0',
                        '.1.3.6.1.2.1.1.3.0',
                        '.1.3.6.1.2.1.1.4.0',
                        '.1.3.6.1.2.1.1.5.0',
                        '.1.3.6.1.2.1.1.6.0'];

                snmpGet(host, oids, function(err, result){

                    if (err){
                        return cb(err);
                    } else {
                        if (result && result.length > 0){
                            var data = util.format("Description: %s\n" +
                                                   "Uptime: %s days\n" +
                                                   "System contact: %s\n" +
                                                   "System name: %s\n" +
                                                   "System location: %s\n",
                                                    result[0],
                                                    moment.duration(result[1]/100, 'seconds').asDays().toFixed(0),
                                                    result[2], result[3], result[4]);

                            return cb(null, {equipment: equipment.id, name: 'system information', description: data});
                        } else {
                            return cb(null);
                        }
                    }
                });
            }
        }, function(err, data){
            if (err){
                return callback(err);
            } else {
                return callback(null, _.compact(_.values(data)));
            }
        });


    }
};
