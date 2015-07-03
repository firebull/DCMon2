var request = require('supertest');
var crypto = require('crypto');

describe('EventsController', function() {

    var testMsg, agent;

    before(function(done){
        agent = request.agent(sails.hooks.http.app);

        // Need to create test record before
        var msg = "Mocha test message";
        var entry = {
            level: 'info',
            confirmed: false,
            hash: crypto.createHash('md5').update(msg).digest('hex'),
            count: 1,
            '@source': 'mochatest',
            '@message': msg,
            '@timestamp': new Date().toISOString()
        };

        sails.elastic.index({
            index: 'logs',
            type: 'info',
            body: entry
        }, function save( error, res ) {
                if (error) return done(error);
                testMsg = res;

                agent
                .post('/auth/local')
                .field('identifier', sails.config.dcmon.admin.name)
                .field('password', sails.config.dcmon.admin.password )
                .expect(302)
                .expect('location','/')
                .end(done);
        });

    });

    after(function(done){
        agent
        .get('/logout')
        .expect(302)
        .expect('location','/login')
        .end(done);
    });

    describe('#confirm()', function() {
        this.timeout(2000);
        it('should add confirmed status to prevously created test message', function (done) {
            if (_.isEmpty(testMsg)){
                throw 'No test message was created before';
            }

            agent
            .post('/events/confirm/info/' + testMsg._id)
            .expect(200)
            .end(done);
        });
    });

    describe('#comment()', function() {
        this.timeout(2000);
        it('should add comment to prevously created test message', function (done) {
            if (_.isEmpty(testMsg)){
                throw 'No test message was created before';
            }

            var comment = "Mocha test comment";

            agent
            .post('/events/comment/info/' + testMsg._id)
            .send({comment: comment})
            .expect(200)
            .end(function(err, res){
                if(err) return done(err);
                (res.body).should.be.Object();
                (res.body._source.comment).should.be.Array();
                (res.body._source.comment[0]).should.have.properties(['timestamp', 'username', 'user_id', 'comment']);
                done();
            });
        });
    });

    describe('#delete()', function() {
        this.timeout(2000);
        it('should delete prevously created test message', function (done) {
            if (_.isEmpty(testMsg)){
                throw 'No test message was created before';
            }

            agent
            .post('/events/delete/info/' + testMsg._id)
            .expect(200)
            .end(done);
        });
    });

});
