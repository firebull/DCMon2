/**
 * AlertController
 *
 * @description :: Server-side logic for managing Alerts
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var util = require('util');

module.exports = {

	/**
	 * Get all Alerts with Levels without Equipment and Users
	 * @return {Object}     Alerts
	 */
	find: function(req, res){
		Alert.find()
			.populate('levels')
			.exec(function(err, alerts){
				if (err){
					return res.serverError();
				} else {
					return res.ok(alerts);
				}
			});

	},

	/**
	 * Redefine Create action in controller
	 * to reduce parsed and sended data from
	 * populated Equipment and User models
	 * @param  {Object} req.body New creating data
	 * @return {Object} Created Alert record with Levels
	 */
	create: function(req, res){
		if (req.body === undefined){
			return res.badRequest();
		}

		Alert.create(req.body).exec(function(err, result){
			if (err){
				return res.serverError();
			} else {
				Alert.findOne({id: result.id})
					.populate('levels')
					.exec(function(err, alert){
						if (err){
							return res.serverError();
						} else {
							res.status(201);
							return res.json(alert);
						}
					});
			}
		});
	},

	/**
	* Redefine Update action in controller
	* to reduce parsed and sended data from
	* populated Equipment and User models
	* @param  {Object} req.body New creating data
	* @return {Object} Update Alert record with Levels
	*/
	update: function(req, res){
		if (req.body === undefined || !req.params.id){
			return res.badRequest();
		}

		Alert.update({id: req.params.id}, req.body).exec(function(err, result){
			if (err){
				return res.serverError();
			} else {
				Alert.findOne({id: req.params.id})
					.populate('levels')
					.exec(function(err, alert){
						if (err){
							return res.serverError();
						} else {
							return res.ok(alert);
						}
					});
			}
		});
	},

	/**
	 * Get all Equipment IDs with requested Alert
	 * @param  {Integer} req.params.id Alert ID
	 * @return {Array}
	 */
	eqOfAlert: function(req, res){
		if (!req.params.id){
			return res.badRequest();
		}

		var query = util.format("SELECT `Equipment`.`id` FROM `equipment` AS `Equipment` \
								JOIN `alert_equipments__equipment_alerts` AS `AlertEq` \
								ON (`AlertEq`.`alert_equipments` = '%d' \
									AND `AlertEq`.`equipment_alerts` = `Equipment`.`id`)", req.params.id);

	    Equipment.query(query, function(err, eqs){
			if (err){
				return res.serverError();
			} else {
				return res.ok(_.pluck(eqs, 'id'));
			}
		});
	}
};
