module.exports = {

    powerStatesByType: function(req){
        var lang = req.getLocale();

        return {'on': sails.__({ phrase: 'Power On',
                                  locale: lang}),
                'off': sails.__({ phrase: 'Power Off',
                                  locale: lang})};
    },

    statusByType: function(req){
        var lang = req.getLocale();

        return {'ok': sails.__({ phrase: 'OK',
                                  locale: lang}),
                'info': sails.__({ phrase: 'Info',
                                  locale: lang}),
                'warn': sails.__({ phrase: 'Warning',
                                  locale: lang}),
                'error': sails.__({ phrase: 'Error',
                                  locale: lang}),
                'alert': sails.__({ phrase: 'Alert',
                                  locale: lang}),
                'crit': sails.__({ phrase: 'Critical',
                                  locale: lang}),
                'emerg': sails.__({ phrase: 'Emergency',
                                  locale: lang})};
    },

    yesNoArray: function(req){
        var lang = req.getLocale();

        return {'yes': sails.__({ phrase: 'Yes',
                                  locale: lang}),
                'no': sails.__({ phrase: 'No',
                                  locale: lang})};
    },

    eqTypesByType: function(req){
        var lang = req.getLocale();

        return {'server': sails.__({ phrase: 'Server',
                                  locale: lang}),
                'store': sails.__({ phrase: 'Data Store',
                                  locale: lang}),
                'lan': sails.__({ phrase: 'Lan',
                                  locale: lang})};
    },

    protocolsByname: function(req){
        var lang = req.getLocale();

        return { "ipmi":     "IPMI",
                 "ipmiv2":   "IPMI v2",
                 "ilo_http": "HP iLo HTTP",
                 "ilo_raw":  "HP iLo RAW",
                 "snmp":     "SNMP"};
    },

    vendorsByName: function(){
        var vendors = sails.config.dcmon.vendors;
        var byName = {};

        vendors.forEach(function(item){
            byName[item.name] = item.longname;
        });

        return byName;
    },

    vendorsList: function(){
        var vendors = sails.config.dcmon.vendors;
        var list = [];

        vendors.forEach(function(item){
            list.push(item.name);
        });

        return list;
    }
};
