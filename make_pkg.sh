#/usr/bin/bash

### INIT ###
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR

if (( "$#" != 2 )) 
then
	echo "Usage: $0 app_name app_version, e.g. $0 devcenter 1.0.0"
	exit 1
fi

APP_NAME=$1
APP_VERSION=$2


### BUILD ###
npm install

### PACKAGE ###
# collect temp files in target dir  (maven standard)
mkdir -p target/
cd target/

#create dir for packaging
mkdir $APP_NAME
cd $APP_NAME

#create links to things to be packaged
ln -s $SCRIPT_DIR/app.js
ln -s $SCRIPT_DIR/start.js
ln -s $SCRIPT_DIR/jp.py
ln -s $SCRIPT_DIR/lib
ln -s $SCRIPT_DIR/make_pkg.sh
ln -s $SCRIPT_DIR/package.json
ln -s $SCRIPT_DIR/public
ln -s $SCRIPT_DIR/routes
ln -s $SCRIPT_DIR/views
ln -s $SCRIPT_DIR/node_modules
ln -s $SCRIPT_DIR/mmx-console.sh

#create the tar!
cd ..
#tar czfh $APP_NAME-$APP_VERSION.tar.gz $APP_NAME/*
zip -r $APP_NAME-$APP_VERSION.zip $APP_NAME/*


