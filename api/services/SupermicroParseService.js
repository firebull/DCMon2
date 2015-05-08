/*
    You can write your own parsers, just put them in servises/<Vendor>ParseService.js
    Then add vendor in dcmon.js

    Must return json object like:

    { sensors:
       [ { name: 'System_Temp',
           current: 31,
           units: 'degrees C',
           timestamp: 1431086975 },
         { name: 'CPU1_Vcore',
           current: 1.024,
           units: 'Volts',
           timestamp: 1431086975 }],
      limits:
       [ { name: 'System_Temp', min: -5, max: 75 },
         { name: 'CPU1_Vcore', min: 0.752, max: 1.352 }] }


 */


var XRegExp = require('xregexp').XRegExp;

module.exports = {
    sensors: function(rawData, callback){
        var pattern = XRegExp('^(?<sensor>[\\+\\-\\.0-9a-zA-Z\\s]+)\\s+\\|\\s+(?<current>[\\-\\+\\d]+\\.\\d*)\\s+\\|\\s+(?<units>[a-zA-Z\\s]+)\\s+\\|\\s+(?<state>[\\da-zA-Z]+)\\s+\\|\\s+(?<min_danger>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<min_crit>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<min>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<max>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<max_crit>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<max_danger>[\\-\\+\\d]+\\.\\d+)\\s*$', 'gi');

        var splitted  = rawData.toString().split('\n');
        var parsed;
        var result    = {'sensors': [], 'limits': []};
        var timestamp = Date.now() / 1000 | 0;


        splitted.forEach(function(string){
            parsed = XRegExp.exec(string, pattern);
            sensorData   = {};
            sensorLimits = {};
            sensorName   = "";

            if (parsed !== null){

                // Remove spaces, - and + for OpenTSDB
                sensorName = XRegExp.replace(parsed.sensor.trim(), ' ', '_');
                sensorName = XRegExp.replace(sensorName, '-', 'minus_');
                sensorName = XRegExp.replace(sensorName, '+', 'plus_');

                // Data for OpenTSDB
                sensorData.name = sensorName;
                sensorData.current = parseFloat(parsed.current.trim());
                sensorData.units = parsed.units.trim();
                sensorData.timestamp = timestamp;

                result.sensors.push(sensorData);

                // Set array of server sensors limits
                min = parsed.min.trim();
                max = parsed.max.trim();
                maxCrit = parsed.max_crit.trim();
                maxDanger = parsed.max_danger.trim();

                // Let's normalize limits data for 'na' data
                if (min == 'na'){
                    min = 0;
                } else {
                    min = parseFloat(min);
                }

                if (max == 'na'){
                    if (maxCrit != 'na' && parseFloat(maxCrit) > 0){
                        max = parseFloat(maxCrit);
                    } else if (maxDanger != 'na' && parseFloat(maxDanger) > 0){
                        max = parseFloat(maxDanger);
                    } else if (parsed.current.trim() == 'na'){
                        max = 1;
                    } else {
                        max = parseFloat(parsed.current.trim()) * 5;
                    }
                } else {
                    max = parseFloat(max);
                }

                sensorLimits.name = sensorName;
                sensorLimits.min = min;
                sensorLimits.max = max;

                result.limits.push(sensorLimits);
            }
        });

        callback(false, result);
    }
}
