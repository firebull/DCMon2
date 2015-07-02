describe('DataCenterModel', function() {
    var testDc;

    describe('#create()', function() {
        it('should create test DataCenter', function (done) {
          DataCenter.create({name: 'mochatest', description: 'Mocha Test DC'})
            .exec(function(err, result){
                if (err) return done(err);

                result.should.be.Object().and.have.properties(['id', 'name', 'description', 'racks']);
                testDc = result;

                done();

            });
        });
    });

    describe('#find()', function() {
        it('should get not more then 5 records', function (done) {
            if (_.isEmpty(testDc)){
                throw 'No test DataCenter created before';
            }

            DataCenter.find(null, {limit: 5})
                .then(function(results) {
                    results.should.be.Array();
                    results.length.should.be.below(6);
                    done();
                })
                .catch(done);
        });
    });

    describe('#findOne()', function() {
        it('should get one record by ID', function (done) {
            if (_.isEmpty(testDc)){
                throw 'No test DataCenter created before';
            }

            DataCenter.findOne({id: testDc.id})
                .then(function(result) {
                    result.should.be.Object().and.have.properties(['id', 'name', 'description', 'racks']);
                    done();
                })
                .catch(done);
        });
    });

    describe('#update()', function() {
        it('should update test DataCenter', function (done) {
            if (_.isEmpty(testDc)){
                throw 'No test DataCenter created before';
            }

            DataCenter.update({id: testDc.id}, {name: 'mochatest2', description: 'Mocha Test DC 2'})
                .exec(function(err, result){
                    if (err) return done(err);

                    result.should.be.Array();
                    result[0].should.be.Object().and.have.properties(['id', 'name', 'description', 'racks']);
                    result[0].name.should.be.exactly('mochatest2');
                    result[0].description.should.be.exactly('Mocha Test DC 2');

                    done();
                });
        });
    });

    describe('#destroy()', function() {
        it('should destroy prevoiusly created test DataCenter', function (done) {
            if (_.isEmpty(testDc)){
                throw 'No test DataCenter created before';
            }

            DataCenter.destroy({id: testDc.id})
                .then(function(result) {
                  done();
                })
                .catch(done);
            });
    });

});
