/**
 * EventsController
 *
 * @description :: Server-side logic for managing Events
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var moment = require('moment');

module.exports = {


  /**
   * `EventsController.confirm()`
   */
  confirm: function (req, res) {
    if (req.params.type && req.params.id){
        sails.elastic.update({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id,
                                body: {
                                    doc: {
                                      confirmed: true,
                                      confirmerId: res.locals.user.id,

                                      // Let's save confimer login for history
                                      // in case he will be deleted later
                                      confirmerName: res.locals.user.username,
                                    }
                                }
                            }, function (err, response) {
                                if (err){
                                    sails.logger.info('ERROR: Could not confirm event id %s: %s', req.params.id, err);
                                    return res.json({error: err});
                                } else {
                                    return res.json({result: 'ok'});
                                }
                            });
    } else {
        return res.badRequest();
    }
  },


  /**
   * `EventsController.comment()`
   */
  comment: function (req, res) {
    if (req.params.type && req.params.id && req.body.comment){
        async.waterfall([
                // Get current comments first
                function(callback){
                    sails.elastic.get({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id
                            }, function (err, response) {
                                if (err){
                                    callback(err);
                                } else {
                                    callback(null, response);
                                }
                            });
                },
                // Update comments
                function(event, callback){
                    if (event.found === true){
                        var comments = [];
                        if (event._source.comment !== undefined){
                            comments = event._source.comment;
                        }

                        comments.push({ user_id:  res.locals.user.id,
                                        username: res.locals.user.username,
                                        comment:  _.escape(req.body.comment),
                                        timestamp: moment().toJSON()});

                        sails.elastic.update({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id,
                                body: {
                                    doc: {
                                      comment: comments
                                    }
                                }
                            }, function (err, response) {
                                console.log(response);
                                if (err){
                                    callback(err);
                                } else {
                                    callback(null);
                                }
                            });

                    } else {
                        callback('Event not found');
                    }

                }
            ], function(err){
                if (err){
                    sails.logger.info('ERROR: Could not comment the event id %s: %s', req.params.id, err);
                    return res.json({error: err});
                } else {
                    sails.elastic.get({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id
                            }, function (err, response) {
                                if (err){
                                    return res.serverError();
                                } else {
                                    return res.ok(response);
                                }
                            });
                }
            });
    } else {
        return res.badRequest();
    }
  },


  /**
   * `EventsController.delete()`
   */
  delete: function (req, res) {
    if (req.params.type && req.params.id){
        async.waterfall([
                function(callback){
                    sails.elastic.get({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id
                            }, function (err, response) {
                                if (err){
                                    callback(err);
                                } else {
                                    callback(null, response);
                                }
                            });
                },
                function(event, callback){
                    if (event.found === true){
                        sails.logger.info('User ID %s "%s" deleted event: "%s: %s"',
                                          res.locals.user.id,
                                          res.locals.user.username,
                                          event._type,
                                          event._source['@message']);

                        sails.elastic.delete({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id
                            }, function (err, response) {
                                if (err){
                                    callback(err);
                                } else {
                                    callback(null);
                                }
                        });
                    } else {
                        callback(null);
                    }
                }
            ], function(err){
                if (err){
                    sails.logger.info('ERROR: Could not delete the event id %s: %s', req.params.id, err);
                    res.status(400);
                    return res.json({error: err});
                } else {
                    return res.json({result: 'ok'});
                }
            });

    } else {
        return res.badRequest();
    }
  }
};

