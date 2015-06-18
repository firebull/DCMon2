/**
* Sensors.js
*
* @description :: Sensors model schema
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
      equipment: {
          model: 'equipment'
      },
      params: 'json',
      alarm_sensors: 'json',
      alarm_sensors_params: 'json'
    }
};
