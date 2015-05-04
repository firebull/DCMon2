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
    console.log(req.url);
    return res.view({'url': req.url});
  },


  /**
   * `ConfigController.options()`
   */
  options: function (req, res) {
    return res.json({'url': req.url});
  }
};

