var request = require('supertest');

describe('AlertController', function() {
    var testAlert, testEq, agent;

    before(function(done){
        agent = request.agent(sails.hooks.http.app);

        // Create test Equipment
        var eq = {
            name: 'mochatest',
            description: 'Mocha Test Alert',
            pos_in_rack: 1,
            type: 'server',
            vendor: 'supermicro',
            rackmount: 1
        };

        Equipment.create(eq).exec(function(err, result){
            if (err) return done(err);
            testEq = result;

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
        Equipment.destroy({id: testEq.id}).exec(function(err){
            agent
            .get('/logout')
            .expect(302)
            .expect('location','/login')
            .end(done);
        });
    });

    describe('#create()', function() {
        this.timeout(3000);
        it('should create test alert', function (done) {
            agent
            .post('/alert')
            .send({ name: "Mocha test alert",
                    levels: [1, 2, 3, 4, 5]})
            .expect(201)
            .end(function(err, res){
                if (err) throw err;

                if (_.isEmpty(res.body)){
                    throw 'Recieved empty result';
                }

                (res.body).should.be.Object().and.have.properties(['id', 'name', 'levels']);
                (res.body).should.not.have.keys(['equipments', 'users']);
                (res.body.levels).should.be.Array();

                testAlert = res.body;
                done();
            });
        });
    });

    describe('#find()', function() {
        this.timeout(2000);
        it('should get stored Alert records with Levels only', function (done) {

            if (_.isEmpty(testAlert)){
                throw 'No test Alert was created before';
            }

            agent
            .get('/alert')
            .expect(200)
            .end(function(err, res){
                if (err) throw err;
                (res.body).should.be.Array();
                (res.body).length.should.be.above(0);
                (res.body[0]).should.not.have.keys(['equipments', 'users']);
                done();
              });
        });
    });

    describe('#update()', function() {
        this.timeout(3000);
        it('should update test alert', function (done) {
            if (_.isEmpty(testAlert) || _.isEmpty(testEq)){
                throw 'No test Alert or test Equipment was created before';
            }

            agent
            .put('/alert/' + testAlert.id)
            .send({ name: "Mocha test alert #2",
                    levels: [2, 3, 4],
                    users: [1],
                    equipments: [testEq.id]})
            .expect(200)
            .end(function(err, res){
                if (err) throw err;

                if (_.isEmpty(res.body)){
                    throw 'Recieved empty result';
                }

                (res.body).should.be.Object().and.have.properties(['id', 'name', 'levels']);
                (res.body).should.not.have.keys(['equipments', 'users']);
                (res.body.levels).should.be.Array();
                (res.body.levels).length.should.equal(3);

                testAlert = res.body;
                done();
            });
        });
    });

    describe('#eqsOfAlert()', function() {
        this.timeout(2000);
        it('should get Equipments list for test Alert', function (done) {

            if (_.isEmpty(testAlert) || _.isEmpty(testEq)){
                throw 'No test Alert or test Equipment was created before';
            }

            agent
            .get('/alert/eqsOfAlert/' + testAlert.id)
            .expect(200)
            .end(function(err, res){
                if (err) throw err;
                (res.body).should.be.Array();
                (res.body).length.should.be.above(0);
                (res.body[0]).should.equal(testEq.id);
                done();
              });
        });
    });

    describe('#usersOfAlert()', function() {
        this.timeout(2000);
        it('should get Users list for test Alert', function (done) {

            if (_.isEmpty(testAlert)){
                throw 'No test Alert was created before';
            }

            agent
            .get('/alert/usersOfAlert/' + testAlert.id)
            .expect(200)
            .end(function(err, res){
                if (err) throw err;
                (res.body).should.be.Array();
                (res.body).length.should.be.above(0);
                (res.body[0]).should.equal(1);
                done();
              });
        });
    });

    describe('#destroy()', function() {
        this.timeout(2000);
        it('should destroy prevously created test alert', function (done) {
            if (_.isEmpty(testAlert)){
                throw 'No test Alert was created before';
            }

            agent
            .delete('/alert/' + testAlert.id)
            .expect(200)
            .end(done);
        });
    });

});
