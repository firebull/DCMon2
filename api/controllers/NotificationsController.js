/**
 * NotificationsController
 *
 * @description :: Server-side logic for managing Notifications to Websockets
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

	/**
	 * Subscribes user to global Events notifications
	 *
	 * @param  {String} req.patam.roomName [description]
	 * @return {JSON}   HTTP Code 200 and success message
	 */
	subscribe: function(req, res) {
        var roomName = req.param('roomName');
        sails.sockets.join(req.socket, roomName);
        res.ok({
            message: 'Subscribed to ' + roomName
        });
    }
};
