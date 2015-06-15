var changeCase = require('change-case');

function ipmiShell(q, callback){
    var spawn = require('child_process').spawn;

    var params = [  '-I', q.proto,
                    '-H', q.address,
                    '-U', q.login,
                    '-P', q.password,
                 ];

    _.each(q.command, function(command){
        params.push(command);
    });

    var ipmitool = spawn('ipmitool', params);

    var err     = [],
        result  = "";

    ipmitool.stdout.on('data', function (data) {
        result =  result + data.toString();
    });

    ipmitool.stderr.on('data', function (data) {
        err.push(data.toString());
    });

    ipmitool.on('close', function (code) {

        if (code !== 0) {
            err.push('Ipmitool exited with code: ' + code);

        }

        ipmitool.stdin.end();
        callback(err, result);

    });

    ipmitool.on('error', function (error) {
        ipmitool.stdin.end();
    });
}


module.exports = {
    querySensors: function(equipment, callback){

        var query = {'address':  equipment.address,
                     'login':    equipment.login,
                     'password': equipment.password,
                     'command': ['sensor']
                     };
        var parser;

        if (equipment.sensors_proto == 'ipmi'){
            query.proto = 'lan';
        } else if (equipment.sensors_proto == 'ipmiv2'){
            query.proto = 'lanplus';
        }

        ipmiShell(query, function(err, data){

            if (err.length > 0){
                return callback(err, {});
            }

            parser = eval('Ipmi' + changeCase.pascal(equipment.vendor + 'ParseService'));

            parser.sensors(data, function(err, parsed){

                if (err){
                    return callback(err);
                }

                var sensors_params = {};

                // Let's combine sensor limits from DB and parsed
                if (equipment.sensors !== undefined  && equipment.sensors.params !== undefined){

                    parsed.limits.forEach(function(item, i){

                        // Add sensor limits to DB if absent
                        if (equipment.sensors.params[item.name] === undefined){
                            equipment.sensors.params[item.name] = item;
                            equipment.sensors.params[item.name].warnLimit = 7;
                            equipment.sensors.params[item.name].alertLimit = 3;
                            equipment.sensors.params[item.name].criticalSensor = false;
                            equipment.sensors.params[item.name].ignoreSensor = false;
                            equipment.sensors.params[item.name].related = false;
                        }
                    });

                    sensors_params = equipment.sensors.params;

                } else if (parsed.limits.length > 0) {
                    sensors_params = {};

                    parsed.limits.forEach(function(item, i){
                        sensors_params[item.name] = item;
                        sensors_params[item.name].warnLimit = 7;
                        sensors_params[item.name].alertLimit = 3;
                        sensors_params[item.name].criticalSensor = false;
                        sensors_params[item.name].ignoreSensor = false;
                        sensors_params[item.name].related = false;
                    });

                }

                return callback(null, {'sensors': parsed.sensors, 'limits': sensors_params});

            });
        });

    },

    queryGlobalSensors: function(equipment, callback){

        var query = {'address':  equipment.address,
                     'login':    equipment.login,
                     'password': equipment.password,
                     'command': ['chassis', 'status']
                     };
        var parser;

        if (equipment.sensors_proto == 'ipmi'){
            query.proto = 'lan';
        } else if (equipment.sensors_proto == 'ipmiv2'){
            query.proto = 'lanplus';
        }

        ipmiShell(query, function(err, data){

            if (err.length > 0){
                return callback(err, {});
            }

            parser = eval('Ipmi' + changeCase.pascal(equipment.vendor + 'ParseService'));

            parser.globalSensors(data, function(err, parsed){
                if (err){
                    return callback(err);
                }

                return callback(null, parsed);
            });

        });

    },

    queryEvents: function(equipment, callback){

        var query = {'address':  equipment.address,
                     'login':    equipment.login,
                     'password': equipment.password,
                     'command': ['sel', 'elist']
                     };
        var parser;

        if (equipment.events_proto == 'ipmi'){
            query.proto = 'lan';
        } else if (equipment.events_proto == 'ipmiv2'){
            query.proto = 'lanplus';
        }

        ipmiShell(query, function(err, data){

            if (err.length > 0){
                return callback(err, {});
            }

            parser = eval('Ipmi' + changeCase.pascal(equipment.vendor + 'ParseService'));

            parser.events(data, function(err, parsed){
                callback(null, parsed);
            });

        });
    },

    /**
     * Clear events
     * @param  {Object}   equipment [requested equipment data]
     * @param  {Function} callback
     */
    clearEvents: function(equipment, callback){
        var query = {'address':  equipment.address,
                     'login':    equipment.login,
                     'password': equipment.password,
                     'command': ['sel', 'clear']
                     };
        var parser;

        if (equipment.sensors_proto == 'ipmi'){
            query.proto = 'lan';
        } else if (equipment.sensors_proto == 'ipmiv2'){
            query.proto = 'lanplus';
        }

        ipmiShell(query, function(err, data){

            if (err.length > 0){
                return callback(err);
            } else {
                return callback(null);
            }
        });
    },

    queryFullInfo: function(equipment, callback){

        if (equipment.query_configuration === false){
            return callback(null);
        }

        var query = {'address':  equipment.address,
                     'login':    equipment.login,
                     'password': equipment.password,
                     'command': ['chassis', 'status']
                     };
        var result = [];

        if (equipment.configuration_proto == 'ipmi'){
            query.proto = 'lan';
        } else if (equipment.configuration_proto == 'ipmiv2'){
            query.proto = 'lanplus';
        }

        // Let's get data in series
        async.series([
            function(cb){
                query.command = ['mc', 'info'];
                ipmiShell(query, function(err, data){
                    if (err.length > 0){
                        return cb(err);
                    } else {
                        result.push({equipment: equipment.id, name: 'mc info', description: data});
                        return cb(null);
                    }
                });
            },
            function(cb){
                query.command = ['mc', 'watchdog', 'get'];
                ipmiShell(query, function(err, data){
                    if (err.length > 0){
                        return cb(err);
                    } else {
                        result.push({equipment: equipment.id, name: 'mc watchdog get', description: data});
                        return cb(null);
                    }
                });
            },
            function(cb){
                query.command = ['fru'];
                ipmiShell(query, function(err, data){
                    if (err.length > 0){
                        return cb(err);
                    } else {
                        result.push({equipment: equipment.id, name: 'fru', description: data});
                        return cb(null);
                    }
                });
            },
            function(cb){
                query.command = ['sol', 'info'];
                ipmiShell(query, function(err, data){
                    if (err.length > 0){
                        return cb(err);
                    } else {
                        result.push({equipment: equipment.id, name: 'sol info', description: data});
                        return cb(null);
                    }
                });
            },
            function(cb){
                query.command = ['user', 'list'];
                ipmiShell(query, function(err, data){
                    if (err.length > 0){
                        // Do not return error as this request may be unsupported
                        return cb(null);
                    } else {
                        result.push({equipment: equipment.id, name: 'user list', description: data});
                        return cb(null);
                    }
                });
            },
            function(cb){
                query.command = ['session', 'info', 'all'];
                ipmiShell(query, function(err, data){
                    if (err.length > 0){
                        // Do not return error as this request may be unsupported
                        return cb(null);
                    } else {
                        result.push({equipment: equipment.id, name: 'session info all', description: data});
                        return cb(null);
                    }
                });
            },
        ], function(err){
            if (err){
                callback(err);
            } else {
                callback(null, result);
            }
        });
    },
};
