/**
* Group.js
*
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
    users: {
        collection: 'user',
        via: 'group'
    }
  }
};

