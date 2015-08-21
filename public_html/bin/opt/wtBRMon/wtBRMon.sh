#!/bin/sh
# wtBRMon : Realtime per-IP bandwidth Monitor
# Antoine Delaisse <wtc0der@gmail.com>
# From CSD Projects Original Script : https://csdprojects.co.uk/ddwrt/
# Thank You ;)
#################################################################################

LAN_IFACE=$(uci get network.lan.ifname)
LAN_TYPE=$(uci get network.lan.ipaddr | awk -F. ' { print $1"."$2 }')
LOCK_FILE=/tmp/wtBRMon.lock
TMP_DATA_FILE=/tmp/wtBRMon.data
WEB_FOLDER=/www
CURRENT_TIME=$(date +%s)
OLD_UP=0
OLD_DL=0
DL=0
UP=0


if [ -f $LOCK_FILE ];
then
  if [ ! -d /proc/$(cat $LOCK_FILE) ]; then
    echo "WARNING : Lockfile detected but process $(cat $LOCK_FILE) does not exist. Reinitialising lock file!"
    rm -f $LOCK_FILE
  else
    echo "WARNING : Process is already running as $(cat $LOCK_FILE), restart"
    kill -9 $(cat $LOCK_FILE)
    rm -f $LOCK_FILE
  fi
fi

echo $$ > $LOCK_FILE
echo "Monitoring network ${LAN_TYPE}.x.255"

# Check the number of ip_conntrack fields
CONNTRACK=$(tail -n1 /proc/net/nf_conntrack | awk 'END { print NF; }')

while :
do

# Mise à jour des règles QOS
	QOS_DL=$(uci get qos.wan.download)
	QOS_UP=$(uci get qos.wan.upload)

#Create the RRDIPT CHAIN (it doesn't matter if it already exists).
  iptables -N RRDIPT 2> /dev/null

  #Add the RRDIPT CHAIN to the FORWARD chain (if non existing).
  iptables -L FORWARD --line-numbers -n | grep "RRDIPT" | grep "1" > /dev/null
  if [ $? -ne 0 ]; then
    iptables -L FORWARD -n | grep "RRDIPT" > /dev/null
    if [ $? -eq 0 ]; then
      iptables -D FORWARD -j RRDIPT
    fi
  iptables -I FORWARD -j RRDIPT
  fi

  #For each host in the ARP table
  grep ${LAN_TYPE} /proc/net/arp | while read IP TYPE FLAGS MAC MASK IFACE
  do
    #Add iptable rules (if non existing).
    iptables -nL RRDIPT | grep "${IP}[[:space:]]" > /dev/null
    if [ $? -ne 0 ]; then
      iptables -I RRDIPT -d ${IP} -j RETURN
      iptables -I RRDIPT -s ${IP} -j RETURN
    fi
  done

PREV_TIME=$CURRENT_TIME
CURRENT_TIME=$(date +%s)


echo '{"data": { "arp" : [' >> $TMP_DATA_FILE
	CNT=0
	grep ${LAN_TYPE} /proc/net/arp | while read IP A B MAC C NETWORK
	do
		if [[ "$CNT" != 0 ]]
		then
			echo ',' >> $TMP_DATA_FILE
		fi
		CNT=1
		echo '{"IP": "'$IP'", "MAC": "'$MAC'", "NETWORK": "'$NETWORK'"}' >> $TMP_DATA_FILE
	done

	echo '],' >> $TMP_DATA_FILE

echo '"QOS" : [{"QOS_DL": '$QOS_DL',"QOS_UP" : '$QOS_UP'}],' >> $TMP_DATA_FILE


echo '"bandwidth" : [' >> $TMP_DATA_FILE
	CNT=0
	iptables -L RRDIPT -vnx -t filter | grep ${LAN_TYPE}| while read PKT BYTE TARGET PROT OPT IN OUT SRC DST
	do
		if [[ "$CNT" != 0 ]]
		then
			echo ',' >> $TMP_DATA_FILE
		fi
		CNT=1
		echo '{"PKT": ' $PKT ', "BYTE": ' $BYTE ', "SRC": "'$SRC'", "DST": "'$DST'", "CURRENT_TIME" : '$CURRENT_TIME', "PREV_TIME" : '$PREV_TIME'}' >> $TMP_DATA_FILE
	done

	echo '] }}' >> $TMP_DATA_FILE

  mv -f $TMP_DATA_FILE $WEB_FOLDER/wtBRMon.json
  sleep 1
done
