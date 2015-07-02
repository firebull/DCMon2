var request = require('supertest');

describe('RackMountController', function() {
    var agent;

    before(function(done) {
        agent = request.agent(sails.hooks.http.app);

        agent
        .post('/auth/local')
        .field('identifier', sails.config.dcmon.admin.name)
        .field('password', sails.config.dcmon.admin.password )
        .expect(302)
        .expect('location','/')
        .end(done);
    });

    after(function(done){
        agent
        .get('/logout')
        .expect(302)
        .expect('location','/login')
        .end(done);
    });

    describe('#states()', function() {
        this.timeout(2000);
        it('should recieve raskmounts states', function (done) {
            DataCenter.find({select: ['id']}, {limit: 1}).exec(function(err, dc){
                if (err) throw err;
                dc.should.be.Array();
                dc.length.should.be.equal(1);

                agent
                .get('/rackmount/states/' + dc[0].id)
                .expect(200)
                .end(done);
            });
        });
    });
});
