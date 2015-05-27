// Block Group action for every user

module.exports = {
      _config: {
        actions: true,
        shortcuts: true,
        rest: true
      },

    list: function(req, res){
        Group.find({}, {sort: 'id'}).exec(function(err, found){
            if (err){
                return res.json({error: err, groups: []});
            } else {
                var groups = [];

                _.forEach(found, function(item){
                    groups.push({ id: item.id,
                                  name: item.name,
                                  description: item.description});
                });

                return res.json({groups: groups});
            }
        });
    }
};
