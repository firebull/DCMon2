
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
     * @return {Object}        List of alerted users
     */
    alertUsersList: function(eq, level){
        /*
        SELECT `Alert`.`id`, `Alert`.`name`
        FROM `alert` AS `Alert`
        JOIN `alert_equipments__equipment_alerts` AS `AlertEq`
            ON (`AlertEq`.`equipment_alerts` = <EQ ID> AND `AlertEq`.`alert_equipments` = `Alert`.`id`)
        JOIN `alertlevels` AS `Level`
            ON(`Level`.`level` = <level>)
        JOIN  `alert_levels__alertlevels_alerts` AS `LevelJoin`
            ON (`LevelJoin`.`alert_levels` = `Alert`.`id` AND `LevelJoin`.`alertlevels_alerts` = `Level`.`id`)
         */
    }

};
