/*

    Global DC Mon 2 variables

 */

module.exports.dcmon = {
    // Basic Admin user, created at server start
    admin: { name:     'admin',
             password: 'Admin12345' },

    // List of avaliable vendors
    vendors: [{name: 'hp', longname: 'HP'},
              {name: 'supermicro', longname: 'SuperMicro'},
              {name: 'common', longname: 'Common (SNMP Only)'}],

    // InfluxDB parameters
    influx: { host : 'localhost',
              port : 8086, // optional, default 8086
              protocol : 'http', // optional, default 'http'
              username : 'dbuser',
              password : 'f4ncyp4ass',
              database : 'my_database',
              timePrecision : 's' },

    // Elasticsearch DB parameters
    elastical: { host : 'localhost',
                 port : 9200 },

    // Number of parallel threads of quering equipments
    numOfThreads: 50

};
