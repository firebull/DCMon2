/**
* DataCenter.js
*
* @description :: DataCenters model schema
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
    description: 'text',
    racks: {
        collection: 'rackmount',
        via: 'datacenter'
    }
  }
};
