var util = require('util');

function ipmiShell(q, callback){
    var spawn = require('child_process').spawn;

    var ipmitool = spawn('ipmitool', [  '-I', q.proto,
                                        '-H', q.address,
                                        '-U', q.login,
                                        '-P', q.password,
                                        q.command]);

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

            parser = eval(equipment.vendor.charAt(0).toUpperCase() + equipment.vendor.slice(1) + 'ParseService');

            parser.sensors(data, function(err, parsed){
                var currentStatus  = {};
                var sensors_params = {};

                // Let's combine sensor limits from DB and parsed
                if (equipment.sensors_params !== null){

                    parsed.limits.forEach(function(item, i){

                        // Add sensor limits to DB if absent
                        if (equipment.sensors_params[item.name] === undefined){
                            equipment.sensors_params[item.name] = item;
                            equipment.sensors_params[item.name].warnLimit = 0.07;
                            equipment.sensors_params[item.name].alertLimit = 0.03;
                            equipment.sensors_params[item.name].criticalSensor = false;
                            equipment.sensors_params[item.name].ignoreSensor = false;
                        }
                    });

                    sensors_params = equipment.sensors_params;

                } else if (parsed.limits.length > 0) {
                    sensors_params = {};

                    parsed.limits.forEach(function(item, i){
                        sensors_params[item.name] = item;
                        sensors_params[item.name].warnLimit = 0.07;
                        sensors_params[item.name].alertLimit = 0.03;
                        sensors_params[item.name].criticalSensor = false;
                        sensors_params[item.name].ignoreSensor = false;

                    });

                    currentStatus.sensors_params = sensors_params;
                }

                callback(false, {'sensors': parsed.sensors, 'limits': sensors_params});

            });
        });

    }
};


