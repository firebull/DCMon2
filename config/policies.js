/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.policies.html
 */


module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions (`true` allows public     *
  * access)                                                                  *
  *                                                                          *
  ***************************************************************************/

  '*': [
    'passport',
    'localize',
    'sessionAuth',
  ],

  'auth': {
    '*': ['passport', 'localize']
  },

  'ConfigController': {
    '*': ['passport', 'localize', 'sessionAuth', 'isAdmin']
  },

  'GroupController': {
    '*'      : ['passport', 'localize', 'sessionAuth'],
    'find'   : ['passport', 'localize', 'sessionAuth', 'isManager'],
    'destroy': false,
    'update' : false,
    'create' : false
  },

  'UserController': {
    '*'      : ['passport', 'localize', 'sessionAuth', 'isAdmin'],
    'me'     : ['passport', 'localize', 'sessionAuth'],
    'find'   : ['passport', 'localize', 'sessionAuth', 'isManager'],
    'destroy': ['passport', 'localize', 'sessionAuth', 'isAdmin'],
    'update' : ['passport', 'localize', 'sessionAuth', 'isProfileOwner','isManager'],
    'create' : ['passport', 'localize', 'sessionAuth', 'isAdmin']
  },

  'DatacenterController': {
    '*'      : ['passport', 'localize', 'sessionAuth'],
    'destroy': ['passport', 'localize', 'sessionAuth', 'isAdmin'],
    'update' : ['passport', 'localize', 'sessionAuth', 'isManager'],
    'create' : ['passport', 'localize', 'sessionAuth', 'isManager']
  },

  'RackMountController': {
    '*'      : ['passport', 'localize', 'sessionAuth'],
    'destroy': ['passport', 'localize', 'sessionAuth', 'isAdmin'],
    'update' : ['passport', 'localize', 'sessionAuth', 'isManager'],
    'create' : ['passport', 'localize', 'sessionAuth', 'isManager']
  },

  'EquipmentController': {
    '*'      : ['passport', 'localize', 'sessionAuth'],
    'destroy': ['passport', 'localize', 'sessionAuth', 'isAdmin'],
    'update' : ['passport', 'localize', 'sessionAuth', 'isManager'],
    'create' : ['passport', 'localize', 'sessionAuth', 'isManager']
  },

  'EventsController': {
    '*'       : ['passport', 'localize', 'sessionAuth', 'isAdmin'],
    'comment' : ['passport', 'localize', 'sessionAuth'],
    'confirm' : ['passport', 'localize', 'sessionAuth'],
    'delete'  : ['passport', 'localize', 'sessionAuth', 'isAdmin']
  },

};
