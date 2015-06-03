/**
* Equipment.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  connection: 'dcmonMysqlServer',
  attributes: {
    id: {
            type: 'integer',
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
    name: { type: 'string',
            required: true
          },
    description: 'text',
    pos_in_rack: 'integer',
    type: {
            type: 'string',
            required: true,
            enum: ['server', 'store', 'lan']
          },
    vendor: {
                type: 'string',
                required: true,
                enum: HelperService.vendorsList()
            },
    address:    { type: 'string' },
    address_v6: { type: 'ipv6' },
    snmp_trap: 'string',
    login:     'string',
    password:  'string',
    monitoring_enable: {
                         type: 'boolean',
                         defaultsTo: true
                        },
    power_state: {
                    type: 'string',
                    enum: ['off', 'on'],
                    defaultsTo: 'on'
                 },
    sensor_status: {
                type: 'string',
                enum: ['ok', 'warn', 'error', 'alert', 'crit', 'emerg'],
                defaultsTo: 'ok'
            },
    event_status: {
                type: 'string',
                enum: ['ok', 'warn', 'error', 'alert', 'crit', 'emerg'],
                defaultsTo: 'ok'
            },
    query_configuration: {
                            type: 'boolean',
                            defaultsTo: true
                         },
    sensors_params: 'json',
    sensors_state: 'json',
    sensors_proto:  'string',
    global_sensors_params: 'json',
    global_sensors: 'json',
    events_proto:   'string',
    configuration_proto: 'string',
    rackmount: {
        model: 'rackmount',
        required: true,
    },
    info: {
        collection: 'eqinfo',
        via: 'equipment'
    },
    // Override toJSON instance method to remove password value
    toJSON: function() {
      var obj = this.toObject();
      delete obj.password;
      return obj;
    }
  },


};
