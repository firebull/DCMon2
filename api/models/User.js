var User = {
  schema: true,
  connection: 'dcmonMysqlServer',

  attributes: {
      id: {
              type: 'integer',
              primaryKey: true,
              autoIncrement: true,
              unique: true
          },
      username  : { type: 'string',
                    unique: true,
                    required: true },
      first_name: { type: 'string' },
      last_name : { type: 'string' },
      email     : { type: 'email',
                    unique: true,
                    required: true },
      lang      : { type: 'string',
                    defaultsTo: 'en',
                    enum: ['en', 'ru'],
                    },
      passports : { collection: 'Passport',
                    via: 'user' },
      group     : { model: 'group',
                    via: 'users',
                    required: true },
      alerts    : { collection: 'alert',
                    via: 'users',
                    dominant: false }
  },
  //model validation messages definitions
  validationMessages: { //hand for i18n & l10n
        email: {
            required: 'Email is required',
            email: 'Provide valid email address',
            unique: 'Email address is already taken'
        },
        username: {
            required: 'Username is required',
            unique: 'Username is already taken'
        },
        group: {
            required: 'Group is required',
        },
    }
};

module.exports = User;
