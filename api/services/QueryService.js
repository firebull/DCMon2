module.exports = {
    queryEqs: function(callback){
        Equipment
         .find({'monitoring_enable': true})
         .populate('rackmount')
         .populate('sensors')
         .exec(function(err, eqs){
            if (err){
                return callback('Could not get equipment list from DB: ' + err);
            } else {

                if (eqs.length > 0){

                    async.eachLimit(eqs, sails.config.dcmon.numOfThreads, function(item, eachCallback){
                        // We will query each equipment in series, not parallel
                        // Some equipment may block parallel requests or just hang like HP iLo
                        async.series([
                            // Query events
                            function(asyncCallback){
                                if (item.events_proto == 'ipmi' || item.events_proto == 'ipmiv2'){
                                    sails.logger.info('Query events of %s (%s) trough IPMI', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    IpmiService.queryEvents(item, function(err, data){
                                        if (err && err.toString().trim() != 'SEL has no entries'){
                                            sails.logger.error('Could not query events through IPMI: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            // There is now func to save events yet
                                            //Save sensors to DB and alert if needed
                                            SaveService.saveEvents(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } else if (item.events_proto == 'snmp'){
                                    sails.logger.info('Query events of %s (%s) trough SNMP', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    SnmpService.queryEvents(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query events through SNMP: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            // There is now func to save events yet
                                            //Save sensors to DB and alert if needed
                                            SaveService.saveEvents(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    return asyncCallback(null);
                                }
                            },
                            // Query sensors
                            function(asyncCallback){
                                if (item.sensors_proto == 'ipmi' || item.sensors_proto == 'ipmiv2'){
                                    sails.logger.info('Query sensors of %s (%s) trough IPMI', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    IpmiService.querySensors(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query sensors through IPMI: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save sensors to DB and alert if needed
                                            SaveService.saveSensors(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } else if (item.sensors_proto == 'snmp'){
                                    sails.logger.info('Query sensors of %s (%s) trough SNMP', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    SnmpService.querySensors(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query sensors through SNMP: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save sensors to DB and alert if needed
                                            SaveService.saveSensors(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    return asyncCallback(null);
                                }
                            },
                            // Query Alarm sensors
                            function(asyncCallback){
                                if (item.sensors_proto == 'ipmi' || item.sensors_proto == 'ipmiv2'){
                                    sails.logger.info('Query alarm sensors of %s (%s) trough IPMI', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    IpmiService.queryAlarmSensors(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query alarm sensors through IPMI: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save alarm sensors to DB and alert if needed
                                            SaveService.saveAlarmSensors(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } else if (item.sensors_proto == 'snmp'){
                                    sails.logger.info('Query alarm sensors of %s (%s) trough SNMP', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    SnmpService.queryAlarmSensors(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query alarm sensors through SNMP: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save alarm sensors to DB and alert if needed
                                            SaveService.saveAlarmSensors(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    return asyncCallback(null);
                                }
                            },
                            // Query information
                            function(asyncCallback){
                                if (item.configuration_proto == 'ipmi' || item.configuration_proto == 'ipmiv2'){
                                    if (item.query_configuration === false){
                                        return asyncCallback(null);
                                    }

                                    sails.logger.info('Query equipment information of %s (%s) trough IPMI', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    IpmiService.queryFullInfo(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query equipment information IPMI: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save information to DB and alert if needed
                                            SaveService.saveInfo(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } if (item.configuration_proto == 'snmp'){
                                    if (item.query_configuration === false){
                                        return asyncCallback(null);
                                    }

                                    sails.logger.info('Query equipment information of %s (%s) trough SNMP', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    SnmpService.queryFullInfo(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query equipment information SNMP: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            return asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save information to DB and alert if needed
                                            SaveService.saveInfo(item, data, function(err){
                                                if (err){
                                                    return asyncCallback(err);
                                                } else {
                                                    return asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    return asyncCallback(null);
                                }
                            }
                        ],
                        // set global eachLimit callback
                        function(seriesErr){
                            if (seriesErr){
                                return eachCallback(seriesErr);
                            } else {
                                return eachCallback(null);
                            }
                        });
                    }, function(err){
                        // if any of the file processing produced an error, err would equal that error
                        if(err) {
                            // One of the iterations produced an error.
                            // All processing will now stop.
                            sails.dcmonLogger.alert('Emergency error while query of the equipment list. Read previous messages.');
                            return callback(err, eqs);
                        } else {
                            // Query finished without errors
                            return callback(null, eqs);
                        }
                    });

                } else {
                    return callback(null);
                }
            }
         });
    }
};
