var request = require('supertest');

describe('UserController', function() {
    var agent;
    var user, sessionUser;

    before(function(done) {
        agent = request.agent(sails.hooks.http.app);
        done();
    });

    describe('#unauthoritive access check and login', function() {
        this.timeout(3000);

        it('should block unauthoritive access to user profile', function () {
            agent
            .get('/user/me')
            .expect(401)
            .end();
        });

        it('after login should redirect to /', function(done) {
            agent
            .post('/auth/local')
            .field('identifier', sails.config.dcmon.admin.name)
            .field('password', sails.config.dcmon.admin.password )
            .expect(302)
            .expect('location','/')
            .end(done);
        });

    });

    describe('#me()', function() {
        this.timeout(2000);
        it('should allow authenticated access to user profile', function (done) {
            agent
            .get('/user/me')
            .expect(200)
            .end(function(err, res){
                if (err) throw err;

                if (_.isEmpty(res.body)){
                    throw 'Recieved empty user session data';
                } else {
                    sessionUser = res.body;
                }

                done();
            });
        });
    });

    describe('#create()', function() {
        this.timeout(3000);
        it('should create test user "mochatest"', function (done) {
            agent
            .post('/user')
            .send({ username  : 'mochatest',
                    first_name: 'Mocha',
                    last_name : 'Test',
                    email     : 'mochatest@dcmon.local',
                    group     : 1})
            .expect(201)
            .end(function(err, res){
                if (err) throw err;

                if (_.isEmpty(res.body)){
                    throw 'Recieved empty result';
                }

                user = res.body;
                done();
            });
        });
    });

    describe('#find()', function() {
        this.timeout(2000);
        it('should recieve maximum 5 stored users', function (done) {
            agent
            .get('/user')
            .send({limit: 5})
            .expect(200)
            .end(function(err, res){
                if (err) throw err;
                res.body.should.be.Array();
                res.body.length.should.be.below(6);
                res.body[0].should.not.have.keys('passports');
                done();
              });
        });
    });

    describe('#findOne()', function() {
        this.timeout(2000);
        it('should recieve previously created user "mochatest"', function (done) {
            if (_.isEmpty(user)){
                throw 'No "mochatest" user created before';
            }

            agent
            .get('/user/' + user.id)
            .expect(200)
            .end(function(err, res){
                if (err) throw err;
                res.body.passports.should.be.Array();
                done();
              });
        });
    });

    describe('#update()', function() {
        this.timeout(2000);
        it('should update prevously created user "mochatest" data', function (done) {
            if (_.isEmpty(user)){
                throw 'No mochatest user created before';
            }

            agent
            .put('/user/' + user.id)
            .send({ id: 100000000, // ID cannot be changed, so test this
                    username  : 'mochatest2',
                    first_name: 'Mocha2',
                    last_name : 'Test2',
                    email     : 'mochatest2@dcmon.local',
                    group     : 3})
            .expect(200)
            .end(function(err, res){
                if (err) throw err;

                if (_.isEmpty(res.body)){
                    throw 'Recieved empty result';
                } else if (res.body.id != user.id){
                    throw 'User ID was changed, this is wrong!';
                } else if (res.body.username == user.username){
                    throw 'User data was not changed!';
                }

                done();
              });
        });
    });

    describe('#lang()', function() {
        this.timeout(2000);
        it('should change language for current user', function (done) {
            agent
            .post('/user/lang')
            .send({lang: 'ru'})
            .expect(200)
            .end(function(err, res){
                if (err) throw err;

                // Return language back and test Model update function
                User.update({username: 'admin'}, {lang: sessionUser.lang}).exec(done);

              });
        });
    });

    describe('#destroy()', function() {
        this.timeout(2000);
        it('should destroy prevously created user "mochatest"', function (done) {
            if (_.isEmpty(user)){
                throw 'No mochatest user created before';
            }

            agent
            .delete('/user/' + user.id)
            .expect(200)
            .end(done);
        });
    });

    describe('#logout()', function() {
        it('after logout should redirect to /login', function(done) {
            agent
            .get('/logout')
            .expect(302)
            .expect('location','/login')
            .end(done);
        });
    });

});
