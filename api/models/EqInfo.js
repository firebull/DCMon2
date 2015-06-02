/**
* EqInfo.js
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
      name: 'string',
      description: 'json',
      equipment: {
          model: 'equipment'
      }
  }
};
