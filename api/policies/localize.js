/*
    Localization policy

    If lang is set in session - make it default

 */

module.exports = function (req, res, next) {
    if (req.session.lang) {
        req.setLocale(req.session.lang);
        return next();
    } else if (req.user){
        req.session.lang = req.user.lang;
        req.setLocale(req.session.lang);
        return next();
    } else {
        // Do not change language
        return next();
    }
};
