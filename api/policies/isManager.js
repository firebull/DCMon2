/*
    Check if user is Manager or Administrator
 */

module.exports = function (req, res, next) {

    if (req.session.authenticated && res.locals.user.group <= 2){
        next();
    } else {
        // User is not allowed
        return res.forbidden('You are not permitted to perform this action.');
    }
};
