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
    name: 'string',
    description: 'text',
    pos_in_rack: 'integer',
    type: {
            type: 'string',
            enum: ['server', 'store', 'lan']
          },
    ipmi_address: 'string',
    snmp_trap: 'string',
    login: 'string',
    password: 'string',
    power_state: {
                    type: 'string',
                    enum: ['off', 'on'],
                    default: 'on'
                 },
    status: {
                type: 'string',
                enum: ['ok', 'warn', 'error', 'alert']
            },
    configuration: 'json',
    sensors_proto: 'string',
    events_proto: 'string',
    configuration_proto: 'string',
    rackmount: {
        model: 'rackmount'
    }
  }
};

