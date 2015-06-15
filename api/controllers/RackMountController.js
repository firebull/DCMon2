/**
 * RackMountController
 *
 * @description :: Server-side logic for managing Rackmounts
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

	/**
	 * Get Rackmounts states
	 * @param  {Integer} req.params.id [DC ID]
	 * @return {Object}     [Rackmounts states: ok, warn, alert]
	 */
	states: function(req, res){

		var util = require('util');

		if (!req.params.id){
			return res.badRequest();
		}

		RackMount.find({datacenter: req.params.id, select: ['id']}).exec(function(err, rackIds){
			if (err){
				return res.serverError();
			} else if (rackIds.length == 0){
				return res.ok({});
			} else {
				var query = util.format("SELECT count(*) AS `num`, `event_status` AS `status`, `rackmount` AS `rack` \
				                         FROM `equipment` \
										 WHERE `monitoring_enable` = true \
											AND `rackmount` IN (%s) \
										 GROUP BY `rackmount`, `status`", _.pluck(rackIds, 'id').join());

				Equipment.query(query, function(err, data){
					if (err){
						sails.log.error(err);
						return res.serverError();
					} else {
						// Parse found data to return object
						// {rackId: status}

						var racks = {};

						_.forEach(data, function(item){
							if (racks[item.rack] === undefined){
								if (item.status == 'warn'){
									racks[item.rack] = 'warn';
								} else if(item.status != 'ok'){
									racks[item.rack] = 'alert';
								} else {
									racks[item.rack] = item.status;
								}
							} else if (racks[item.rack] == 'warn' && item.status != 'warn' && item.status != 'ok'){
								racks[item.rack] = 'alert';
							}

						});

						return res.ok(racks);
					}
				});


			}
		});


	}
};
