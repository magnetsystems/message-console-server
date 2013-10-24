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


### TEST ###
#DB setup; developercenter needed by app; developercentertest needed for tests
mysql -u root -e 'drop database if exists developercenter;'
mysql -u root -e 'create database developercenter;'
mysql -u root -e 'drop database if exists developercentertest;'
mysql -u root -e 'create database developercentertest;'

#start app and run tests
nohup NODEV_ENV=test node app.js &
export NODEJS_PID=$!
./node_modules/.bin/jasmine-node --captureExceptions --verbose --junitreport --output target/test/ spec/
kill $NODEJS_PID


### PACKAGE ###
# collect temp files in target dir  (maven standard)
mkdir -p target/
cd target/

#create dir for packaging
mkdir $APP_NAME-$APP_VERSION
cd $APP_NAME-$APP_VERSION

#create links to things to be packaged
ln -s $SCRIPT_DIR/app.js
ln -s $SCRIPT_DIR/data
ln -s $SCRIPT_DIR/jp.py
ln -s $SCRIPT_DIR/lib
ln -s $SCRIPT_DIR/license
ln -s $SCRIPT_DIR/make_pkg.sh
ln -s $SCRIPT_DIR/package.json
ln -s $SCRIPT_DIR/public
ln -s $SCRIPT_DIR/queryPlans.txt
ln -s $SCRIPT_DIR/routes
ln -s $SCRIPT_DIR/spec
ln -s $SCRIPT_DIR/views
ln -s $SCRIPT_DIR/node_modules

#create the tar!
cd ..
tar czfh $APP_NAME-$APP_VERSION.tar.gz $APP_NAME-$APP_VERSION/*


