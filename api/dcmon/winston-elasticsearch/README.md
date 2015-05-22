# winston-elasticsearch
An ElasticSearch transport for Winston.
This version is rewritten to work with original Elasticsearch node client. Aslo added timestamp parse from meta. If it is given, then log will be stored with it. By default it will be stored with current timestamp.

Thanx for original code to [jackdbernier](https://github.com/jackdbernier/winston-elasticsearch)

## How to use
More example(s) available in the examples directory.
```javascript
    var winston = require( 'winston' );
    var winstonElastic = require('../api/dcmon/winston-elasticsearch/index');

    var logger = new winston.Logger({
      transports: [
        new winstonElastic({ level: 'info' })
      ]
    });
```

## Options
* *level* ['info'] log level
* *fireAndForget* [false] if set to true, it sends the data in back ground. If a callback is passed, it gets callback at the begining of the function without parameters.
* *indexName* ['logs'] Elasticsearch index
* *typeName* ['log'] Elasticsearch type
* *client* An instance of [elastical client](https://github.com/ramv/node-elastical) if given all the following options are ignored.
* *source* An identifier for the system/site/request that triggered the entry. Defaults to directory name of the main module filename of main module if not set.
* *disable_fields* Disables the automatically generated and added fields that include PID, user, memory usage, runtime, etc.
