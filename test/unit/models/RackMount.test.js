describe('RackMountModel', function() {
    var testRack;

    describe('#create()', function() {
        it('should create test RackMount', function (done) {
            DataCenter.find({select: ['id']}, {limit: 1}).exec(function(err, dc){
                if (err) throw err;
                dc.should.be.Array();
                dc[0].should.be.Object().and.have.properties('id');

                RackMount.create({name: 'mochatest', description: 'Mocha Test RackMount', datacenter: dc[0].id})
                    .exec(function(err, result){
                        if (err) return done(err);

                        result.should.be.Object().and.have.properties(['id', 'name', 'description', 'datacenter']);
                        testRack = result;

                        done();

                    });
            });


        });
    });

    describe('#find()', function() {
        it('should get not more then 5 records', function (done) {
            if (_.isEmpty(testRack)){
                throw 'No test RackMount created before';
            }

            RackMount.find(null, {limit: 5})
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
            if (_.isEmpty(testRack)){
                throw 'No test RackMount created before';
            }

            RackMount
                .findOne({id: testRack.id})
                .populate('datacenter')
                .then(function(result) {
                    result.should.be.Object().and.have.properties(['id', 'name', 'description', 'datacenter']);
                    result.datacenter.should.be.Object().and.have.properties(['id', 'name', 'description', 'racks']);
                    done();
                })
                .catch(done);
        });
    });

    describe('#update()', function() {
        it('should update test RackMount', function (done) {
            if (_.isEmpty(testRack)){
                throw 'No test RackMount created before';
            }

            RackMount.update({id: testRack.id}, {name: 'mochatest2', description: 'Mocha Test RackMount 2'})
                .exec(function(err, result){
                    if (err) return done(err);

                    result.should.be.Array();
                    result[0].should.be.Object().and.have.properties(['id', 'name', 'description', 'datacenter']);
                    result[0].name.should.be.exactly('mochatest2');
                    result[0].description.should.be.exactly('Mocha Test RackMount 2');

                    done();
                });
        });
    });

    describe('#destroy()', function() {
        it('should destroy prevoiusly created test RackMount', function (done) {
            if (_.isEmpty(testRack)){
                throw 'No test RackMount created before';
            }

            RackMount.destroy({id: testRack.id})
                .then(function(result) {
                  done();
                })
                .catch(done);
            });
    });
});
