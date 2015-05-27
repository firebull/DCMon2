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
    var util = require('util');
    var elasticsearch = require('elasticsearch');
    var winstonElastic = require('../api/dcmon/winston-elasticsearch/index');


    var elasticHost = util.format('http://%s:%s', sails.config.dcmon.elastical.host, sails.config.dcmon.elastical.port);
    sails.elastic = new elasticsearch.Client({host: elasticHost, log: 'error'});

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
            crit:   2,
            warn:   4
        },
        colors: {
            emerg: 'red',
            alert: 'red',
            crit:  'red',
            warn:  'orange'
        }
      };

    sails.dcmonLogger = new (winston.Logger)({
        levels: dcmonLevels.levels,
        transports: [
            new (winston.transports.Console)({
              name: 'emerg-console',
              timestamp: true,
              prettyPrint: true,
              colorize: true,
              level: 'emerg'
            }),
            new (winston.transports.File)({
              name: 'info-emerg',
              filename: 'dcmon-emerg.log',
              level: 'emerg',
              maxFiles: 5
            }),
            // Elasticsearch
            new (winstonElastic)({
              name: 'emerg-elastic',
              timestamp: true,
              level: 'emerg',
              client: sails.elastic,
              disable_fields: true,
              source: 'DC Monitor 2'
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
          client: sails.elastic,
          disable_fields: true,
          source: 'DC Monitor 2'
        }),
      ]
    });

    setInterval(function(){
        QueryService.queryEqs(function(err, result){
            sails.logger.info('Query finished');
            sails.sockets.blast('statusUpdates', {message: 'sensorsUpdated'});
            if (err){
                sails.logger.error('Could not finish query: %s', err);
            }
        });
    }, 180000);

    sails.services.passport.loadStrategies();

    // Create default groups
    Group.find().exec(function(err, admins){
        if (admins.length === 0){
            var groups = [
                {id: 1, name: 'admins', description: 'Administrators'},
                {id: 2, name: 'managers', description: 'Managers'},
                {id: 3, name: 'monitors', description: 'Monitoring Users'},
            ];

            Group.create(groups, function(err, created){
                if (err){
                    sails.log.error('Could not create groups for users: %s. Auth WILL NOT WORK!!!', err);
                }
            });
        }
    });

    // Create deafult Admin user
    User.findOne({username: 'admin'}).exec(function(err, user){
        if (!user){
            var admin = {username: 'admin',
                         first_name: 'Administrator',
                         email: 'admin@local.local',
                         group: 1};

            User.create(admin, function(err, created){
                if (err){
                    sails.log.error('Could not create admin user: %s. You wont be able to login!', err);
                } else {
                    var userPassport = { password: 'Admin12345',
                                         user: created.id,
                                         protocol: 'local'};

                    Passport.create(userPassport).exec(function(err, passport){
                        if (err){
                            sails.log.error('Could not create passport for admin user: %s. You wont be able to login!', err);
                        } else {
                            sails.log('Admin user is created. Login: "%s", Password: "%s"', admin.username, userPassport.password);
                        }
                    });
                }
            });
        }
    });

    // It's very important to trigger this callback method when you are finished
    // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
    cb();
};
