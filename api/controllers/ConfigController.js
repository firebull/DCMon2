/**
 * ConfigController
 *
 * @description :: Server-side logic for managing Configs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  /**
   * `ConfigController.eq()`
   */
  eq: function (req, res) {
    return res.view({'url': req.url});
  },

  /**
   * `ConfigController.users()`
   */
  users: function (req, res) {
    return res.view({'url': req.url});
  },

  /**
   * `ConfigController.alerts()`
   */
  alerts: function (req, res) {
      return res.view({'url': req.url});
  },

  /**
   * `ConfigController.options()`
   */
  options: function (req, res) {
    return res.json({'url': req.url});
  }
};
