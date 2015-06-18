/**
* EqInfo.js
*
* @description :: Equipment Information model schema
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
      name: 'string',
      description: 'json',
      equipment: {
          model: 'equipment'
      }
  }
};
