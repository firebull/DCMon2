var util   = require('util');
var format = require("string-template");

module.exports = {

    saveSensors: function(equipment, data, cb){

        if (data === undefined || data.length === 0){
            return cb(null);
        }

        var influx = require('influx');
        var ip     = require('ip').toLong;

        var influxClient = influx({
                              // or single-host configuration
                              host : sails.config.dcmon.influx.host,
                              port : sails.config.dcmon.influx.port, // optional, default 8086
                              protocol : sails.config.dcmon.influx.protocol, // optional, default 'http'
                              username : sails.config.dcmon.influx.username,
                              password : sails.config.dcmon.influx.password,
                              database : sails.config.dcmon.influx.database,
                              timePrecision : sails.config.dcmon.influx.timePrecision
                            });
        var saveData = {};
        var limits   = {};
        var currentState  = {sensors_state: {}};
        var sensorsStates = {warn: {}, alert: {}};

        if (data.sensors.length > 0){
            data.sensors.forEach(function(sensor){
                // Prepare data for InfluxDB
                saveData['ip' + ip(equipment.address) + '.' + sensor.name] = [{value: sensor.current,
                                                                               time: sensor.timestamp}];

                limits = data.limits[sensor.name];

                // Parse for value limits and alert if needed
                if (limits.ignoreSensor === false){

                    // Count deviations
                    if (sensor.current !== 0){
                        minDev = Math.abs((sensor.current - limits.min) / sensor.current)*100;
                    } else {
                        minDev = 0;
                    }

                    maxDev = Math.abs((limits.max - sensor.current) / limits.max)*100;

                    // Alert if out of ranges
                    if (sensor.current <= limits.min || sensor.current >= limits.max)
                    {
                        sails.dcmonLogger.alert("Sensor '%s' is out of Range! Current: %s. Limits: [%s, %s].",
                                                sensor.name, sensor.current, limits.min, limits.max,
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                        currentState.sensor_status = 'alert';
                        sensorsStates.alert[sensor.name] = sensor;
                    }
                    else
                    //Alert if close to ranges
                    if (minDev <= limits.alertLimit || maxDev <= limits.alertLimit)
                    {
                        sails.dcmonLogger.alert("Sensor '%s' is at Range limits! Current: %s. Limits: [%s, %s].",
                                                sensor.name, sensor.current, limits.min, limits.max,
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                        currentState.sensor_status = 'alert';
                        sensorsStates.alert[sensor.name] = sensor;
                    }
                    else
                    // Warning if close to warn limits
                    if ((minDev > limits.alertLimit && minDev <= limits.warnLimit)
                            || (maxDev > limits.alertLimit && maxDev <= limits.warnLimit))
                    {
                        sails.dcmonLogger.warn("Sensor '%s' is close to Range limits! Current: %s. Limits: [%s, %s].",
                                           sensor.name, sensor.current, limits.min, limits.max,
                                           {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                        if (currentState.sensor_status != 'alert') {
                            currentState.sensor_status = 'warn';
                        }

                        sensorsStates.warn[sensor.name] = sensor;
                    }
                }
            });

            // If there are sensors in Alert or Warning state - save them
            if (_.size(sensorsStates.warn) > 0 || _.size(sensorsStates.alert) > 0){
                currentState.sensors_state = sensorsStates;
                Equipment.message(equipment.id, {message: 'eventsUpdated'});
            } else {
                currentState.sensors_state = {};
                currentState.sensor_status = 'ok';
            }

            async.parallel([
                            function(callback){
                                //ASYNC: Save equipment sensor_params to DB
                                Sensors.findOrCreate({equipment: equipment.id}, {equipment: equipment.id, params: {}}).exec(function(err, record){
                                    if (err){
                                        sails.dcmonLogger.emerg('Could not find or create sensors params record in DB: %s', err,
                                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                        callback(err);
                                    } else {
                                        if (data.limits){
                                            Sensors.update({'id': record.id}, {params: data.limits}, function(err, result){
                                                if (err){
                                                    sails.dcmonLogger.emerg('Could not update sensors params record in DB: %s', err,
                                                                            {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                                    callback(err);
                                                } else {
                                                    Equipment.update({id: equipment.id}, {sensors: record.id}).exec(function(err){
                                                        if (err){
                                                            sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                                                                    {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                                        }
                                                    });
                                                    callback(null);
                                                }
                                            });
                                        } else {
                                            callback(null);
                                        }
                                    }
                                });
                            },
                            function(callback){
                                //ASYNC: Save equipment sensor_status to DB
                                Equipment.update({'id': equipment.id}, currentState, function(err, result){
                                    if (err){
                                        sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                        callback(err);
                                    } else {
                                        if (currentState.sensors_state != {}){
                                            Equipment.publishUpdate(equipment.id, {sensor_status: result[0].sensor_status, sensors_state: currentState.sensors_state, updatedAt: result[0].updatedAt});
                                        } else {
                                            Equipment.publishUpdate(equipment.id, {sensor_status: result[0].sensor_status, updatedAt: result[0].updatedAt});
                                        }

                                        callback(null);
                                    }
                                });
                            },
                            function(callback){
                                //ASYNC: Save point data to InfluxDB
                                if (Object.keys(saveData).length > 0){
                                    influxClient.writeSeries(saveData, function(err){
                                        if (err){
                                            sails.dcmonLogger.emerg('Could not save equipment sensors data in DB: %s', err,
                                                                    {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                            callback(err);
                                        } else {
                                            Equipment.message(equipment.id, {message: 'sensorsUpdated'});
                                            callback(null);
                                        }
                                    });
                                } else {
                                    sails.logger.info('%s (%s): No sensors data to save', equipment.name, equipment.address, {host: equipment.address, eq: equipment.id});
                                    callback(null);
                                }
                            },
                           ],
                function(err, results){
                    if (err){
                        cb(err);
                    } else {
                        cb(null);
                    }
                });

        }
    },

    /**
     * Save JSON data of current Alarm sensors state
     * Also parse data for alerts
     * @param  {Object}   equipment [current equipment data from DB]
     * @param  {Object}   data      [parsed data with sensors]
     * @param  {Function} cb        [callback function]
     * @return {string}             [error]
     */
    saveAlarmSensors: function(equipment, data, cb){
        var normalStates = {
            SystemPower       : 'on',
            PowerOverload     : false,
            PowerInterlock    : 'inactive',
            MainPowerFault    : false,
            PowerControlFault : false,
            ChassisIntrusion  : 'inactive',
            FrontPanelLockout : 'inactive',
            DriveFault        : false,
            CoolingFanFault   : false,
        };

        var sensorsParams;
        var saveData = {alarm_sensors: {}};
        var pastState,
            eqState = 'ok';

        if (equipment.sensors !== undefined){
            sensorsParams = equipment.sensors.alarm_sensors_params;
        }

        // First check if sensors params are exists
        // If not, create object {sensorName: false}
        // False means that sensor is NOT excluded from check
        if(sensorsParams === null || sensorsParams === undefined || _.isEmpty(sensorsParams)){
            sensorsParams = {};

            // For SNMP requests exclude sensors by default from check
            if (equipment.sensors_proto == 'snmp'){
                _.forEach(data, function(item, sensorName){
                    sensorsParams[sensorName] = {
                        ignore: true,
                        name: sensorName,
                        origName: _.clone(item.origName)
                    };
                });
            } else {
                _.forEach(data, function(item, sensorName){
                    sensorsParams[sensorName] = {
                        ignore: false,
                        name: sensorName,
                        origName: _.clone(item.origName)
                    };
                });
            }

            saveData.alarm_sensors_params = sensorsParams;
        }

        _.forEach(data, function(item, sensorName){
            // Check if sensor excluded from check
            if (sensorsParams[sensorName].ignore === false || sensorsParams[sensorName] === undefined){
                // Check if sensor validates normal state

                if (item.type == 'health'){
                    if (normalStates[sensorName] === undefined || item.current === normalStates[sensorName]){
                        item.status = 'ok';
                    } else {
                        sails.dcmonLogger.alert("Sensor '%s' is at fail state! Current: %s. Normal state is: %s.",
                                                sensorName, item.current, normalStates[sensorName],
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                        item.status = 'alert';
                        eqState = 'alert';
                    }
                } else if (item.type == 'ethernet'){

                    if (equipment.sensors.alarm_sensors !== undefined){
                        pastState = equipment.sensors.alarm_sensors[item.name];
                    }

                    // Initial state for first measurment
                    if (!pastState || pastState.current == item.current){
                        item.status = 'ok';
                    } else
                    // Warning event if interface is Up, but last state was not Up
                    if (item.current == 'up' && pastState.current != 'up'){
                        sails.dcmonLogger.warn("Interface '%s' is now Up, but at last check it was '%s'",
                                                item.origName, pastState.current,
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                        item.status = 'ok';
                        if (eqState != 'alert'){
                            eqState = 'warn';
                        }
                    } else
                    // Alert message if state changes
                    if (pastState.current != item.current) {
                        sails.dcmonLogger.alert("Interface '%s' is now '%s', but at last check it was '%s'",
                                                item.origName, item.current, pastState.current,
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                        item.status = 'alert';
                        eqState = 'alert';
                    }
                }
            }

            // We do not need to store orginal name of alarm sensor in DB
            // as it is saved in alarm_sensors_params
            delete(item.origName);

            saveData.alarm_sensors[sensorName] = item;
        });

        async.parallel([
            function(asyncCallback){
                Sensors.findOrCreate({equipment: equipment.id}, {equipment: equipment.id, alarm_sensors_params: {}, alarm_sensors: {}}).exec(function(err, record){
                    if (err){
                        sails.dcmonLogger.emerg('Could not find or create sensors params record in DB: %s', err,
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                        return asyncCallback(err);
                    } else {
                        Sensors.update({'id': record.id}, saveData).exec(function(err, result){
                            if (err){
                                sails.dcmonLogger.emerg('Could not save global sensors data in DB: %s', err,
                                                        {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                return asyncCallback(err);
                            } else {
                                Equipment.update({id: equipment.id}, {sensors: record.id}).exec(function(err){
                                    if (err){
                                        sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                    }
                                });

                                return asyncCallback(null);
                            }
                        });
                    }
                });
            },
            function(asyncCallback){
                Equipment.update({id: equipment.id}, {sensor_status: eqState}).exec(function(err){
                    if (err){
                        sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                    }

                    return asyncCallback(null);
                });
            },
        ], function(err){
            Equipment.findOne({id: equipment.id, select: ['sensor_status']}).populate('sensors').exec(function(err, eq){
                if (err){
                    return cb(err);
                } else {
                    Equipment.publishUpdate(equipment.id, eq);
                    return cb(null);
                }
            });
        });
    },

    saveEvents: function(equipment, data, cb){

        var numberLevels = {
                emerg:  0,
                alert:  1,
                crit:   2,
                error:  3,
                warn:   4,
                notice: 5,
                info:   6,
                debug:  7,
                ok:     6 // Fake level as in DB event_status is OK in normal
            };

        var levels = ['emerg', 'alert', 'crit', 'error', 'warn', 'notice', 'info', 'debug'];

        if (data === undefined || data.length > 0){

            var commonStatus = numberLevels[equipment.event_status];

            _.forEach(data, function(message){
                sails.dcmonLogger[message.level](message.msg, {timestamp: message.timestamp, host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                // Define common equipment event status
                // If it is worth then already stored in DB - set it
                if (numberLevels[message.level] !== undefined && numberLevels[message.level] < commonStatus){
                    commonStatus = numberLevels[message.level];
                }
            });

            IpmiService.clearEvents(equipment, function(err){
                if (err){
                    sails.dcmonLogger.error('Could not clear equipment events through IPMI: %s', err,
                                            {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                }
            });

            //ASYNC: Save equipment event_status to DB
            Equipment.update({'id': equipment.id}, {event_status: levels[commonStatus]}, function(err, result){
                if (err){
                    sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                            {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                    return cb(err);
                } else {
                    sails.sockets.blast('statusUpdates', {message: 'eventsUpdated'});
                    Equipment.message(equipment.id, {message: 'eventsUpdated'});
                    Equipment.publishUpdate(equipment.id, {event_status: result[0].event_status, updatedAt: result[0].updatedAt});
                    return cb(null);
                }
            });

        } else {
            // If no new events and current state of server not OK,
            // then query all not confirmed events and get state from them
            // This is done to renew state if events were confirmed

            var eventStatus = 'ok'; // Basic normal status

            query = {
                      aggregations: {
                         "group_by_level": {
                           "terms": {
                             "field": "level"
                           }
                         }
                       },
                       query: {
                         filtered: {
                           filter: {
                               bool: {
                                       must:[
                                               { exists : { field : "@fields.host" }},
                                               { term   : { '@fields.host': equipment.address}},
                                               { term   : { confirmed: false}}
                                       ]
                               }
                           }
                         }
                       }
                     };


            sails.elastic.search({  index: 'logs',
                                    size: 0,
                                    search_type: 'count',
                                    body: query},
                function (err, results){
                        if (err && err.length > 0){
                            return cb(err);
                        } else {
                            if (results.hits !== undefined && results.hits.total > 0){
                                // Count current events state
                                _.forEach(results.aggregations.group_by_level.buckets,
                                    function(item){
                                        if (numberLevels[item.key] < numberLevels[eventStatus]){
                                            eventStatus = item.key;
                                        }
                                });
                            }

                            // If current and counted levels are different - save new
                            if (equipment.event_status != eventStatus){
                                Equipment.update({id: equipment.id},
                                                 {event_status: eventStatus},
                                                 function(err, result){
                                                     if (err){
                                                         sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                                                                 {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                                         return cb(err);
                                                     } else {
                                                         sails.sockets.blast('statusUpdates', {message: 'eventsUpdated'});
                                                         Equipment.message(equipment.id, {message: 'eventsUpdated'});
                                                         Equipment.publishUpdate(equipment.id, {event_status: result[0].event_status, updatedAt: result[0].updatedAt});
                                                         return cb(null);
                                                     }
                                                 });
                            } else {
                                return cb(null);
                            }
                        }
                    });


        }
    },

    saveInfo: function(equipment, data, cb){
        // Delete current information
        EqInfo.destroy({equipment: equipment.id}).exec(function(err){
            if (err){
                return cb(err);
            } else {
                EqInfo.create(data).exec(function(err, result){
                    if (err){
                        return cb(err);
                    } else {
                        Equipment.update({id: equipment.id}, {query_configuration: false}).
                            exec(function(err, result){
                                if (err){
                                    return cb(err);
                                } else {
                                    Equipment.publishUpdate(equipment.id, {query_configuration: false, updatedAt: result[0].updatedAt});
                                    return cb(null);
                                }
                            });
                    }
                });
            }
        });
    }

};
