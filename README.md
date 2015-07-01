# DC Monitor 2

This application is designed to monitor different equipment, like Servers, Routers, Switches and so on, by IPMI, iLo or SNMP.

This is Opensource project based on my other project written in Python. That version is very hard to develop as I made some design mistakes, which I will try to bypass. Also, I want to make this project more asynchronous, so that each request to monitored equipment been made completely separately.

## Goals of the project

Why do I want to make one more monitoring utility? Well, in fact there is no any lightweight utility to monitor really big number of servers through IPMI: to get there sensors, event logs, handle their events and alert admins. In my own experience, often troubles can be predicted much earlier if you get low level data such as IPMI Event logs and sensors.

Client side is written using Knockout.js to render data recieved from server by Websockets events. Interface is fast, lightweight and simple, created with Semantic-UI.

## Install

Instruction is for Debian. You can use Linux distribution of your own.
```bash
apt-get install openjdk-7-jre mysql-server redis-server
```

#### InfluxDB (To store graphs data)
Use instructions from [site](https://influxdb.com/docs/v0.9/introduction/installation.html)

#### Elasticsearch (To store event logs)
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
 * Redis parameters to *config/session.js*

#### Start the server
```bash
forever start app.js --prod
```
Go to http://localhost/config/eq (or your real host address) and add Datacenter, Rackmount and equipment.

    Login: admin
    Password: Admin12345

#### Supported equipment status
 * **IPMI protocol:** only Supermicro servers supported;
 * **SNMP protocol:** only LAN devices supported. Basic features like lan ports traffic and states.

#### Tests
Tests coverage is in development yet. For current tests run:
```bash
npm test
```

a [Sails](http://sailsjs.org) application
