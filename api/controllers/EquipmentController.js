/**
 * EquipmentController
 *
 * @description :: Server-side logic for managing Equipment
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	testQuery: function(req, res){

        QueryService.querySensors(function(err, result){
            return res.json({url: req.url, data: result})
        });
    }
};

