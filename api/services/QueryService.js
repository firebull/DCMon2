module.exports = {
    queryEqs: function(callback){
        Equipment
         .find({'monitoring_enable': true})
         .populate('rackmount')
         .exec(function(err, eqs){
            if (err){
                sails.logger.error('Could not get equipment list from DB: %s', err);
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
                                            asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            // There is now func to save events yet
                                            //Save sensors to DB and alert if needed
                                            SaveService.saveEvents(item, data, function(err){
                                                if (err){
                                                    asyncCallback(err);
                                                } else {
                                                    asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                }
                            },
                            // Query sensors
                            function(asyncCallback){
                                if (item.sensors_proto == 'ipmi' || item.sensors_proto == 'ipmiv2'){
                                    sails.logger.info('Query sensors of %s (%s) trough IPMI', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    IpmiService.querySensors(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query sensors through IPMI: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save sensors to DB and alert if needed
                                            SaveService.saveSensors(item, data, function(err){
                                                if (err){
                                                    asyncCallback(err);
                                                } else {
                                                    asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                }
                            },
                            // Query global sensors
                            function(asyncCallback){
                                if (item.sensors_proto == 'ipmi' || item.sensors_proto == 'ipmiv2'){
                                    sails.logger.info('Query global sensors of %s (%s) trough IPMI', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                    IpmiService.queryGlobalSensors(item, function(err, data){
                                        if (err){
                                            sails.logger.error('Could not query global sensors through IPMI: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                            asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save global sensors to DB and alert if needed
                                            SaveService.saveGlobalSensors(item, data, function(err){
                                                if (err){
                                                    asyncCallback(err);
                                                } else {
                                                    asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
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
                                            asyncCallback(null); // Non critical error, lets continue
                                        } else {
                                            //Save information to DB and alert if needed
                                            SaveService.saveInfo(item, data, function(err){
                                                if (err){
                                                    asyncCallback(err);
                                                } else {
                                                    asyncCallback(null);
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        ],
                        // set global eachLimit callback
                        function(seriesErr){
                            if (seriesErr){
                                eachCallback(seriesErr);
                            } else {
                                eachCallback(null);
                            }
                        });
                    }, function(err){
                        // if any of the file processing produced an error, err would equal that error
                        if(err) {
                            // One of the iterations produced an error.
                            // All processing will now stop.
                            sails.dcmonLogger.alert('Emergency error while query of the equipment list. Read previous messages.');
                            callback(err, eqs);
                        } else {
                            // Query finished without errors
                            callback(null, eqs);
                        }
                    });

                } else {
                    callback(null, eqs);
                }
            }
         });
    }
};
