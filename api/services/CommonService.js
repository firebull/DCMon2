
module.exports = {
    setLocale: function(req){
            if (req.query.lang !== undefined){
                req.setLocale(req.query.lang);
            } else {
                req.setLocale('en');
            }
        },

};
