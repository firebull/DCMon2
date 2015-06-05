/**
* Alert.js
*
* @description :: Through this model it is possible to get users list
*                 who must be notified on alerts
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
        levels: {
            collection: 'alertlevels',
            via: 'alerts',
            dominant: false
        },
        equipments: {
            collection: 'equipment',
            via: 'alerts',
            dominant: true
        },
        users: {
            collection: 'user',
            via: 'alerts',
            dominant: true
        }
    },
};
