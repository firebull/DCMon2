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
                                      confirmed: true
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
    if (req.params.type && req.params.id){
        sails.elastic.update({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id,
                                body: {
                                    doc: {
                                      comment: req.body.comment
                                    }
                                }
                            }, function (err, response) {
                                if (err){
                                    sails.logger.info('ERROR: Could not comment the event id %s: %s', req.params.id, err);
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
   * `EventsController.delete()`
   */
  delete: function (req, res) {
    console.log(req.params);
    if (req.params.type && req.params.id){
        sails.elastic.delete({
                                index: 'logs',
                                type:  req.params.type,
                                id:    req.params.id
                            }, function (err, response) {
                                if (err){
                                    sails.logger.info('ERROR: Could not delete the event id %s: %s', req.params.id, err);
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

