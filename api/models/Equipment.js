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
    ipmi_address: {
                    type: 'string',
                    ip: true
                  },
    snmp_trap: 'string',
    login: 'string',
    password: 'string',
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
                enum: ['ok', 'warn', 'error', 'alert'],
                defaultsTo: 'ok'
            },
    configuration: 'json',
    sensors_proto: 'string',
    events_proto: 'string',
    configuration_proto: 'string',
    rackmount: {
        model: 'rackmount',
        required: true,
    }
  }
};

