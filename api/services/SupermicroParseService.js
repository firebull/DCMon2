/*
    You can write your own parsers, just put them in servises/<Vendor>ParseService.js
    Then add vendor in dcmon.js

    Must return json object like:

    { sensors:
       [ { name: 'SystemTemp',
           current: 31,
           units: 'degrees C',
           timestamp: 1431086975 },
         { name: 'Cpu1Vcore',
           current: 1.024,
           units: 'Volts',
           timestamp: 1431086975 }],
      limits:
       [ { name: 'SystemTemp', min: -5, max: 75 },
         { name: 'Cpu1Vcore', min: 0.752, max: 1.352 }] }


 */


var XRegExp = require('xregexp').XRegExp;
var changeCase = require('change-case');
var util = require('util');
var moment = require('moment');

module.exports = {
    sensors: function(rawData, callback){
        var pattern = XRegExp('^(?<sensor>[\\+\\-\\.0-9a-zA-Z\\s]+)\\s+\\|\\s+(?<current>[\\-\\+\\d]+\\.\\d*)\\s+\\|\\s+(?<units>[a-zA-Z\\s]+)\\s+\\|\\s+(?<state>[\\da-zA-Z]+)\\s+\\|\\s+(?<min_danger>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<min_crit>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<min>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<max>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<max_crit>[\\-\\+\\d]+\\.\\d+)\\s+\\|\\s+(?<max_danger>[\\-\\+\\d]+\\.\\d+)\\s*$', 'gi');

        var splitted  = rawData.toString().split('\n');
        var parsed;
        var result    = {'sensors': [], 'limits': []};
        var timestamp = Date.now()/1000;


        splitted.forEach(function(string){
            parsed = XRegExp.exec(string, pattern);
            sensorData   = {};
            sensorLimits = {};
            sensorName   = "";

            if (parsed !== null){
                // Save original name of sensor to show it as graph name
                sensorLimits.origName = parsed.sensor.trim();
                sensorLimits.units = parsed.units.trim();

                // Convert sensor name to PascalCase for InfluxDB
                sensorName = XRegExp.replace(parsed.sensor.trim(), '-', 'minus ');
                sensorName = XRegExp.replace(sensorName, '+', 'plus ');
                sensorName = XRegExp.replace(sensorName, '\.', 'point', 'all');
                sensorName = XRegExp.replace(sensorName, '_', 'underscore', 'all');
                sensorName = changeCase.pascalCase(sensorName);

                // Prepare Data for later parse for InfluxDB
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
    },

    events: function(rawData, callback){

        var pattern = XRegExp('^(?<id>\\s*[0-9a-z]+)\\s*\\|\\s+(?<month>\\d{2})\\/(?<day>\\d{1,2})\\/(?<year>\\d{4})\\s+\\|\\s+(?<hour>\\d{2})\\:(?<minutes>\\d{2})\\:(?<sec>\\d{2})\\s+\\|\\s+(?<sentype>.+)\\s+\\|\\s+(?<desc>.+)\\s+\\|\\s+(?<senvalue>.+)$', 'gi');
        var splitted  = rawData.toString().split('\n');
        var parsed, message, logDate, logTimestamp;
        var result    = [];
        var timestamp = moment().toISOString();

        _.forEach(splitted, function(string){
            parsed = XRegExp.exec(string, pattern);

            if (parsed !== null){
                message = util.format('Event occured: %s: %s. Message: %s',
                                       parsed.sentype.trim(),
                                       parsed.senvalue.trim(),
                                       parsed.desc.trim());

                logDate = util.format("%s-%s-%s %s:%s:%s", parsed.year.trim(),
                                                           parsed.month.trim(),
                                                           parsed.day.trim(),
                                                           parsed.hour.trim(),
                                                           parsed.minutes.trim(),
                                                           parsed.sec.trim());

                logTimestamp = moment(logDate).toISOString();

            } else {
                message = 'Unknown event: ' + string;
                logTimestamp = timestamp;
            }

            result.push({msg: message, timestamp: logTimestamp});
        });

        callback(false, result);

    }
};