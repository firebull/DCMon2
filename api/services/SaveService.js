var util   = require('util');
var format = require("string-template");

module.exports = {

    saveSensors: function(equipment, data, cb){
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
        var sensorsStates = {warn: [], alert: []};

        if (data.sensors.length > 0){
            data.sensors.forEach(function(sensor){
                // Prepare data for InfluxDB
                saveData['ip' + ip(equipment.address) + '.' + sensor.name] = [{value: sensor.current,
                                                                               time: sensor.timestamp}];

                // Parse for value limits and alert if needed
                if (sensor.ignoreSensor === false){

                    limits = data.limits[sensor.name];

                    // Count deviations
                    if (sensor.current !== 0){
                        minDev = Math.abs((sensor.current - limits.min) / sensor.current);
                    } else {
                        minDev = 0;
                    }

                    maxDev = Math.abs((limits.max - sensor.current) / limits.max);

                    if (minDev <= limits.alertLimit
                            || maxDev <= limits.alertLimit
                            || sensor.current <= limits.min
                            || sensor.current >= limits.max)
                    {
                        sails.dcmonLogger.alert("Sensor '%s' is out of Range! Current: %s. Limits: [%s, %s].",
                                                sensor.name, sensor.current, limits.min, limits.max,
                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                        currentState.sensor_status = 'alert';
                        sensorsStates.alert[sensor.name] = sensor;
                    }
                    else
                    if ((minDev > limits.alertLimit && minDev <= limits.warnLimit)
                            || (maxDev > limits.alertLimit && maxDev <= limits.warnLimit))
                    {
                        sails.logger.warn("Sensor '%s' is at Range limits! Current: %s. Limits: [%s, %s].",
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
            if (sensorsStates.warn.length > 0 || sensorsStates.alert.length > 0){
                currentState.sensors_state = sensorsStates;
            } else {
                currentState.sensors_state = {};
                currentState.sensor_status = 'ok';
            }

            currentState.sensors_params = data.limits;

            async.parallel([
                            function(callback){
                                //ASYNC: Save equipment sensor_status to DB
                                Equipment.update({'id': equipment.id}, currentState, function(err, result){
                                    if (err){
                                        sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                                                {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                                        callback(err);
                                    } else {
                                        Equipment.publishUpdate(equipment.id, {sensor_status: result[0].sensor_status, updatedAt: result[0].updatedAt});
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

    saveEvents: function(equipment, data, cb){

        if (data.length > 0){

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

            var commonStatus = numberLevels[equipment.event_status];

            _.forEach(data, function(message){
                //sails.dcmonLogger[message.level](message.msg, {timestamp: message.timestamp, host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});

                // Define common equipment event status
                // If it is worth then already stored in DB - set it
                if (numberLevels[message.level] !== undefined && numberLevels[message.level] < commonStatus){
                    commonStatus = numberLevels[message.level];
                }
            });

            //ASYNC: Save equipment event_status to DB
            Equipment.update({'id': equipment.id}, {event_status: levels[commonStatus]}, function(err, result){
                if (err){
                    sails.dcmonLogger.emerg('Could not update equipment data in DB: %s', err,
                                            {host: equipment.address, eq: equipment.id, rack: equipment.rackmount.id, dc: equipment.rackmount.datacenter});
                    return cb(err);
                } else {
                    Equipment.publishUpdate(equipment.id, {sensor_status: result[0].sensor_status, updatedAt: result[0].updatedAt});
                    return cb(null);
                }
            });

        } else {
            // If no new events and current state of server not OK,
            // then query all not confirmed events and get state from them
            // This is done to renew state if events were confirmed

            // TODO: Implement this

            cb(null);
        }
    }

};
