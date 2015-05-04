# DC Monitor 2

This application is designed to monitor different equipment, like Servers, Routers, Switches and so on, by IPMI, iLo or SNMP.

This is Opensource project based on my other project written on Python. That version is very hard to develop as I made some design mistakes, wich I'll try to bypass. Also, I want to make this project more asynchronous, so that each request to monitored equipment been made completely separately. 

## Goals of the project

Why do I want to make one more monitoring utility? Well, in fact there is no any utility to monitor really big number of servers through IPMI: to get there sensors, event logs, handle their events and alert admins. In my own experience, offen troubles can be predicted much earlier if you get low level data such as IPMI Event logs and sensors.



a [Sails](http://sailsjs.org) application
