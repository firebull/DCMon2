/*
    Check if user is owner of requested User data.
    Or it must be at least Manager
 */

module.exports = function (req, res, next) {

    if (req.session.authenticated && req.params.id == res.locals.user.id){
        next();
    } else {
        // Allow to admins
        if (res.locals.user.group <= 2){
            next();
        } else {
            // User is not allowed
            next('Not owner');
        }
    }
};
