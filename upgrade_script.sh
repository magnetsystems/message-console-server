#!/bin/bash
export DEPLOYDIR=/usr/local/magnet

# Get args
if [ $# -lt 1 ] ; then
  echo "No args. Usage: "
  echo "$0 /path/to/messaging-console-server.tar"
  exit 1
fi

# does the new deploy file exists?
if [ ! -f $1 ]; then
  echo "$1 does not exist. Try again please."
  exit 1
fi

# Am I root?
if [ $EUID -ne 0 ]; then
  echo "must run as root"
  exit 1
fi

# Does the deploy directory already exist?
if [ -d ${DEPLOYDIR}/messaging-console-server ]; then
  service messaging-console-server stop
  mv ${DEPLOYDIR}/messaging-console-server ${DEPLOYDIR}/messaging-console-server-`date -I`
  echo "Backed up old messaging-console-server to ${DEPLOYDIR}/messaging-console-server-`date -I`"
fi

# tar results in a dir application-name-0.0.1 under DEPLOYDIR
tar -C ${DEPLOYDIR} -xf $1

# EDIT THIS LINE TO MATCH VERSION NUMBER IN DIR NAME messaging-console-server-X.x.X to match the actual contents of the tar
mv ${DEPLOYDIR}/messaging-console-server-v1.0.0 ${DEPLOYDIR}/messaging-console-server

chown -R magnet:magnet ${DEPLOYDIR}/messaging-console-server

# SET UP config.json
#
# Reuse config_production.js from last deploy 
mv ${DEPLOYDIR}/messaging-console-server/lib/config/config.json  ${DEPLOYDIR}/messaging-console-server/lib/config/config.json.orig
echo "Backed up the generic config_production.js from this new build to be config.json.orig"

cp ${DEPLOYDIR}/messaging-console-server-`date -I`/lib/config/config.json  ${DEPLOYDIR}/messaging-console-server/lib/config/config.json
echo "Reused config_production.js from last deploy"

chown -R magnet:magnet ${DEPLOYDIR}/messaging-console-server/lib/config

# Set up  config/config.json 
# reuse config.json  from last deploy 

mkdir ${DEPLOYDIR}/messaging-console-server/config
echo "Created dir messaging-console-server/config to store config.json as needed for DB migration"

cp ${DEPLOYDIR}/messaging-console-server-`date -I`/lib/config/config.json  ${DEPLOYDIR}/messaging-console-server/lib/config/config.json
echo "Reused config.json from last deploy"

chown -R magnet:magnet ${DEPLOYDIR}/messaging-console-server/config

echo "All went well I think , now start node.js " 
service messaging-console-server start