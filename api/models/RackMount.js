/**
* RackMount.js
*
* @description :: Rackmounts DB Schema
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
    datacenter: {
        model: 'datacenter',
        via: 'racks'
    },
    equipments: {
        collection: 'equipment',
        via: 'rackmount'
    }
  }
};
