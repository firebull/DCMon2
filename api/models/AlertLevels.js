/**
* AlertLevels.js
*
* @description :: Simple model to request alerts by level
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
    connection: 'dcmonMysqlServer',
    autoCreatedAt: false,
    autoUpdatedAt: false,
    attributes: {
        id: {
              type: 'integer',
              primaryKey: true,
              autoIncrement: true,
              unique: true
          },
        level: {
              type: 'integer',
              unique: true
        },
        name: { type: 'string',
                unique: true
            },
        longname: { type: 'string',
                    unique: true
                },
        alerts: {
            collection: 'alert',
            via: 'levels',
            dominant: true
        }
  }
};
