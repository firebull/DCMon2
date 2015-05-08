/**
* Equipment.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

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
    address:    { type: 'ipv4' },
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
    status: {
                type: 'string',
                enum: ['ok', 'warn', 'error', 'alert', 'crit'],
                defaultsTo: 'ok'
            },
    configuration: 'json',
    query_configuration: {
                            type: 'boolean',
                            defaultsTo: true
                         },
    sensors_params: 'json',
    sensors_proto:  'string',
    events_proto:   'string',
    configuration_proto: 'string',
    rackmount: {
        model: 'rackmount',
        required: true,
    }
  }
};

