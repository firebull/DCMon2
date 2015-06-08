/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var util = require('util');
module.exports = {

  create: function (req, res) {
    var lang = req.getLocale();

    if (req.body){
        req.param('provider', 'local');
    }

    sails.services.passport.protocols.local.createUser(req.body, function (err, created) {

        if (err){
            var errors = [];
            _.forEach(err, function(errorGroup, key){
                _.forEach(errorGroup, function(error){
                    errors.push(sails.__({ phrase: error.message, locale: lang}));
                });
            });

            res.status(400);

            return res.json({errors: errors});
        } else {
            User.findOne({id: created.id}).populate('group').exec(function(err, user){
                    if (err){
                        sails.logger.error('Could not get User ID %s: %s', req.params.id, err);
                        return res.serverError();
                    } else {
                        res.status(201);
                        return res.json(user);
                    }
                });
        }
    });
  },

  update: function(req, res){
    var lang = req.getLocale(),
        passports = req.body.passports;

    delete(req.body.passports);

    async.series([
            function(callback){

                // Cannot change id of user
                if (req.body.id !== undefined){
                    delete(req.body.id);
                }

                // User with simple rights cannot change group =)
                if (res.locals.user.group > 2){
                    delete(req.body.group);
                }

                User.update({id: req.params.id}, req.body, function(err, user){
                    if (err){
                        var errors = [];
                        _.forEach(err, function(errorGroup, key){
                            _.forEach(errorGroup, function(error){
                                errors.push(sails.__({ phrase: error.message, locale: lang}));
                            });
                        });

                        callback(errors);
                    }

                    callback(null);
                });
            },
            function(callback){
                if (req.body.password !== undefined && req.body.password.length > 0){
                    Passport.update({protocol: 'local', user: req.params.id},
                                    {password: req.body.password},
                                    function(err, passport){
                                        if (err){
                                            var errors = [];
                                            _.forEach(err, function(errorGroup, key){
                                                _.forEach(errorGroup, function(error){
                                                    errors.push(sails.__({ phrase: error.message, locale: lang}));
                                                });
                                            });

                                            callback(errors);
                                        }

                                        callback(null);
                                });
                } else {
                    callback(null);
                }
            }
        ], function(err){
            if (err){
                res.status(400);
                return res.json({errors: err});
            } else {
                User.findOne({id: req.params.id}).populate('group').exec(function(err, user){
                    if (err){
                        sails.logger.error('Could not get User ID %s: %s', req.params.id, err);
                        return res.serverError();
                    } else {
                        return res.ok(user);
                    }
                });
            }
        });
  },

  destroy: function(req, res){
    var lang = req.getLocale();

    async.series([
            function(callback){
                User.destroy({id: req.params.id}).exec(function(err){
                    if (err){
                        callback(err);
                    } else {
                        callback(null);
                    }
                });
            },
            function(callback){
                Passport.destroy({user: req.params.id}).exec(function(err){
                    if (err){
                        callback(err);
                    } else {
                        callback(null);
                    }
                });
            }
        ],function(err){
            if (err){
                res.status(400);
                return res.json({errors: err});
            } else {
                return res.ok({result: 'ok'});
            }
        });

  },

  /**
   * User profile data from session
   */
  me: function (req, res) {

    User.findOne({id: req.session.passport.user})
        .populate('group')
        .exec(function(err, user){
            if (err){
                return res.badRequest(err);
            } else {
                return res.ok(user);
            }
    });
  },

  // Set language
  // If user is login, then save lang to DB too
  // Else save only to session (for login page, for example)
  lang: function(req, res) {
    var langs = sails.config.i18n.locales;
    if (req.body && langs.indexOf(req.body.lang) >= 0){
        if (req.session.authenticated){
            User.update({id: req.session.passport.user}, {lang: req.body.lang})
                .exec(function(err){
                    if (err){
                        return res.serverError('Could not save user ID %s lang: %s', req.session.passport.user, err);
                    } else {
                        req.session.lang = req.body.lang;
                        return res.ok();
                    }
            });
        } else {
            req.session.lang = req.body.lang;
            return res.ok();
        }
    } else {
        return res.badRequest('This lang is not availiable');
    }
  },

  // Define this methods in controller as User model
  // is populated with Equipment model and Blueprint calls
  // may be extrimely heavy on big number of alerts
  find: function(req, res){
      User.find().populate('group').exec(function(err, found){
          if (err){
              sails.log.error(err);
              return res.badRequest();
          } else {
              return res.ok(found);
          }
      });
  },

  findOne: function(req, res){
      if (req.params && req.params.id !== undefined){
          User.findOne({id: req.params.id}).populate('group').populate('passports').exec(function(err, found){
              if (err){
                  sails.log.error(err);
                  return res.badRequest();
              } else {
                  return res.ok(found);
              }
          });
      } else {
          return res.badRequest();
      }
  }


};
