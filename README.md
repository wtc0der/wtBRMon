# wtBRMon
A OpenWRT realtime per-IP bandwidth Monitor

## Installation
 - Clone Git repository

 - Copy public_html/bin/init.d/wtBRMon in /etc/init.d/
 - Copy public_html/bin/opt/wtBRMon in /opt/
 - Copy public_html/www in your web server root folder i.e. /www/wtBRMon/

 - chmod +x /etc/init.d/wtBRMon
 - chmod +x /opt/wtBRMon/*

## Launch
 - /etc/init.d/wtBRMon enable
 - /etc/init.d/wtBRMon start
 - Open web browser on http://<ROUTER-IP>/wtBRMon
