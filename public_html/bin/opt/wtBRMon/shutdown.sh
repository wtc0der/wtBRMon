#!/bin/sh
# wtBRMon : Realtime per-IP bandwidth Monitor

LOCK_FILE=/tmp/wtBRMon.lock

if [ -f $LOCK_FILE ];
then
  if [ ! -d /proc/$(cat $LOCK_FILE) ]; then
    echo "WARNING : Lockfile detected but process $(cat $LOCK_FILE) does not exist. Deleting lock file only!"
    rm -f $LOCK_FILE
  else
    echo "Shutdown in progress..."
    kill -9 $(cat $LOCK_FILE)
    rm -f $LOCK_FILE
  fi
fi