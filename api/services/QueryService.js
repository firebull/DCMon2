module.exports = {
    querySensors: function(callback){
        Equipment
         .find({'monitoring_enable': true})
         .populate('rackmount')
         .exec(function(err, eqs){
            if (err){
                console.log(err);
            } else {

                if (eqs.length > 0){

                    eqs.forEach(function(item){
                        if (item.sensors_proto == 'ipmi' || item.sensors_proto == 'ipmiv2'){
                            IpmiService.querySensors(item);
                        }
                    });

                    callback(err, eqs);

                } else {
                    callback(err, eqs);
                }
            }
         });
    }
};
