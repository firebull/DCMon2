/*

    Global DC Mon 2 variables

 */

module.exports.dcmon = {

    // List of avaliable vendors
    vendors: [{name: 'hp', longname: 'HP'},
              {name: 'supermicro', longname: 'SuperMicro'}],

    // InfluxDB params
    influx: { host : 'localhost',
              port : 8086, // optional, default 8086
              protocol : 'http', // optional, default 'http'
              username : 'dbuser',
              password : 'f4ncyp4ass',
              database : 'my_database',
              timePrecision : 's'
             },


}
