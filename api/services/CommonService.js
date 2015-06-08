
module.exports = {
    setLocale: function(req){
            if (req.query.lang !== undefined){
                req.setLocale(req.query.lang);
            } else {
                req.setLocale('en');
            }
        },

    /**
     * Create users list to send notifications to.
     * This is made by low level query to SQL because of Sails
     * can not get given fields list in populate query.
     * So I better get redused data and parse them on my own.
     * @param  {Integer} eq    Equipment ID to get Alerts
     * @param  {String}  level Error level
     * @return {Object}        List of alerted users or error
     */
    alertUsersList: function(eq, level, callback){

        var util = require('util');

        // First of all get all Alerts IDs for Equipment with given Level
        var query = util.format("SELECT `Alert`.`id` \
                                 FROM `alert` AS `Alert` \
                                 JOIN `alert_equipments__equipment_alerts` AS `AlertEq` \
                                    ON (`AlertEq`.`equipment_alerts` = '%s' AND `AlertEq`.`alert_equipments` = `Alert`.`id`) \
                                 JOIN `alertlevels` AS `Level` \
                                    ON(`Level`.`level` = '%s') \
                                 JOIN  `alert_levels__alertlevels_alerts` AS `LevelJoin` \
                                    ON (`LevelJoin`.`alert_levels` = `Alert`.`id` AND `LevelJoin`.`alertlevels_alerts` = `Level`.`id`)",
                                eq, level);

        Alert.query(query, function(err, alerts){

            if (err){
                return callback(err);
            } else if (alerts.length === 0){
                return callback(null);
            } else {
                var alertsIds = _.pluck(alerts, 'id');

                // Now get Users for counted Alerts
                var query = util.format("SELECT `User`.`id`, `User`.`username`, `User`.`email` \
                                        FROM `user` AS `User` \
                                        JOIN `alert_users__user_alerts` AS `AlertUser` \
                                        ON (`AlertUser`.`alert_users` IN (%s) AND `AlertUser`.`user_alerts` = `User`.`id`)",
                                        alertsIds.join());

                User.query(query, function(err, users){
                    if (err){
                        return callback(err);
                    } else {
                        return callback(null, users);
                    }
                });

            }
        });

    },

    /**
     * Notify users about alert message
     * @param  {String} level   Message level
     * @param  {String} message
     * @param  {Object} meta    Meta information
     * @param  {Array} users    Users list
     * @return {Function}       Callback function: null or error
     */
    notifyUsers: function(level, message, meta, users, callback){
        // Not yet Implemented
        // TODO: Implement email notifications
         callback(null);
    }

};
