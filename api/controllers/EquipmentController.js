/**
 * EquipmentController
 *
 * @description :: Server-side logic for managing Equipment
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var util   = require('util');

module.exports = {
	monitor: function(req, res){

        return res.view({'url': req.url});

    },

    testQuery: function(req, res){

        QueryService.querySensors(function(err, result){
            return res.json({url: req.url, data: result})
        });
    }
};

