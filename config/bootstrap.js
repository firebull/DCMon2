/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.bootstrap.html
 */

module.exports.bootstrap = function(cb) {
    var influx  = require('influx');
    var winston = require('winston');

    var elastical = require('elastical');
    var winstonElastic = require('winston-elasticsearch');

    sails.elastical = new elastical.Client(sails.config.dcmon.elastical.host,
                                           {port: sails.config.dcmon.elastical.port});

    sails.influxClient = influx({
                              host : sails.config.dcmon.influx.host,
                              port : sails.config.dcmon.influx.port, // optional, default 8086
                              protocol : sails.config.dcmon.influx.protocol, // optional, default 'http'
                              username : sails.config.dcmon.influx.username,
                              password : sails.config.dcmon.influx.password,
                              database : sails.config.dcmon.influx.database,
                              timePrecision : sails.config.dcmon.influx.timePrecision
                            });

    var dcmonLevels = {
        levels: {
            emerg:  0,
            alert:  1,
            crit:   2
        },
        colors: {
            emerg: 'red',
            alert: 'red',
            crit:  'red'
        }
      };

    sails.dcmonLogger = new (winston.Logger)({
        levels: dcmonLevels.levels,
        transports: [
            new (winston.transports.File)({
              name: 'info-emerg',
              filename: 'dcmon-emerg.log',
              level: 'emerg',
              maxFiles: 5
            }),
        ]});

    winston.addColors(dcmonLevels.colors);

    sails.logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({
          name: 'info-console',
          timestamp: true,
          prettyPrint: true,
          colorize: true,
          level: 'info'
        }),
        new (winston.transports.File)({
          name: 'info-file',
          filename: 'dcmon-info.log',
          level: 'info',
          maxFiles: 5
        }),
        new (winston.transports.File)({
          name: 'error-file',
          filename: 'dcmon-error.log',
          level: 'error',
          maxFiles: 5
        }),

        // Elasticsearch
        new (winstonElastic)({
          name: 'info-elastic',
          timestamp: true,
          level: 'info',
          client: sails.elastical,
          disable_fields: true,
          source: 'DC Monitor 2'
        }),
      ]
    });

    setInterval(function(){
        QueryService.querySensors(function(err, result){
            sails.logger.info('Sensors query finished');
            sails.sockets.blast('statusUpdates', {message: 'sensorsUpdated'});
            if (err){
                sails.logger.error('Could not query sensors: %s', err);
            }
        });
    }, 180000);

    // It's very important to trigger this callback method when you are finished
    // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
    cb();
};
