module.exports = {
    querySensors: function(callback){
        Equipment
         .find({'monitoring_enable': true})
         .populate('rackmount')
         .exec(function(err, eqs){
            if (err){
                sails.logger.error('Could not get equipment list from DB: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
            } else {

                if (eqs.length > 0){

                    eqs.forEach(function(item){
                        if (item.sensors_proto == 'ipmi' || item.sensors_proto == 'ipmiv2'){
                            sails.logger.info('Query %s (%s) trough IPMI', item.name, item.address, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                            IpmiService.querySensors(item, function(err, data){
                                if (err){
                                    sails.logger.error('Could not query through IPMI: %s', err, {host: item.address, eq: item.id, rack: item.rackmount.id, dc: item.rackmount.datacenter});
                                } else {
                                    //ASYNC: Save sensors to DB and alert if needed
                                    SaveService.saveSensors(item, data);
                                }
                            });
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
