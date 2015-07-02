var Sails = require('sails'),
    sails;

before(function(done) {
    this.timeout(10000);
    Sails.lift({
        // configuration for testing purposes
    }, function(err, server) {
        sails = server;
        if (err) return done(err);
        done(err, sails);
    });
});

after(function(done) {
    // here you can clear fixtures, etc.
    Sails.lower(done);
});
