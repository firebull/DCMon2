/**
 * NotificationsController
 *
 * @description :: Server-side logic for managing Notifications to Websockets
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	subscribe: function(req, res) {
        var roomName = req.param('roomName');
        sails.sockets.join(req.socket, roomName);
        res.json({
            message: 'Subscribed to ' + roomName
        });
    }
};

