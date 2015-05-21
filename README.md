# DC Monitor 2 (IN HARD DEVELOPMENT!)

This application is designed to monitor different equipment, like Servers, Routers, Switches and so on, by IPMI, iLo or SNMP.

This is Opensource project based on my other project written on Python. That version is very hard to develop as I made some design mistakes, wich I'll try to bypass. Also, I want to make this project more asynchronous, so that each request to monitored equipment been made completely separately. 

## Goals of the project

Why do I want to make one more monitoring utility? Well, in fact there is no any utility to monitor really big number of servers through IPMI: to get there sensors, event logs, handle their events and alert admins. In my own experience, offen troubles can be predicted much earlier if you get low level data such as IPMI Event logs and sensors.

## Install

Instruction is for Debian. You can use Linux distribution of your own.
```bash
apt-get install openjdk-7-jre mysql-server
```

#### InfluxDB
Use instructions from [site](http://influxdb.com/docs/v0.8/introduction/installation.html)

#### Elasticsearch
Use instructions from [site](https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-repositories.html)

#### Get DC Monitor 2
```bash
git clone https://github.com/firebull/DCMon2.git
cd DCMon2
npm install -g sails
npm install -g forever
npm install
```

#### Configuration
Add DB parameters to configuration files:
 * MYSQL parameters to *config/connections.js*
 * InfluxDB and Elasticsearch parameters to *config/dcmon.js*

#### Start the server
```bash
forever start app.js --prod
```
Go to http://localhost/config/eq (or your real host address) and add Datacenter, Rackmount and equipment. *For now only Supermicro servers and IPMI protocol supported*.

a [Sails](http://sailsjs.org) application
