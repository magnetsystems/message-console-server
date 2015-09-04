#/usr/bin/bash

### INIT ###
SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"

cd $SCRIPT_DIR

if [ -z ${1+x} ] || [ -z ${2+x} ]; then
	echo "Usage: $0 app_name app_version, e.g. $0 devcenter 1.0.0"
	exit 1
fi

APP_NAME=$1
APP_VERSION=$2
BUILD_NUMBER=$3


### BUILD ###
npm install
# npm install forever-monitor --no-bin-link
# npm install node-xmpp-component --no-bin-link
# rm -rf node_modules/winston/node_modules/request/node_modules/form-data/node_modules/combined-stream/node_modules/delayed-stream/test/

if [ ! -d node_modules ] ; then
	echo "node.js modules not installed correctly! exiting."
	exit 1
fi

# npm dedupe

### TEST ###
mysql -u root -e 'DROP DATABASE IF EXISTS magnetmessagedb;'

# wget http://build.magnet.com:8082/job/mmx-develop-all-maven/lastSuccessfulBuild/artifact/tools/mmx-standalone-dist/target/mmx-standalone-dist.zip
# unzip mmx-standalone-dist.zip
# cd mmx-standalone-dist/messaging/bin
# ./mmx-server.sh start
# cd ../../..

#start app and run tests
nohup node app.js &
export NODEJS_PID=$!
./node_modules/.bin/istanbul cover --report cobertura --dir target/report/ -- ./node_modules/.bin/jasmine-node --forceexit --captureExceptions --verbose --junitreport --config TEST_ENV jenkins --output target/test/ spec/
kill $NODEJS_PID

# cd mmx-standalone-dist/messaging/bin
# ./mmx-server.sh stop
# cd ../../..

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
ln -s $SCRIPT_DIR/startup.properties
ln -s $SCRIPT_DIR/make_pkg.sh
ln -s $SCRIPT_DIR/package.json
ln -s $SCRIPT_DIR/public
ln -s $SCRIPT_DIR/routes
ln -s $SCRIPT_DIR/views
ln -s $SCRIPT_DIR/node_modules
ln -s $SCRIPT_DIR/mmx-console.bat
ln -s $SCRIPT_DIR/mmx-console.sh
if [ -d "$SCRIPT_DIR/quickstart-android" ]; then
  ln -s $SCRIPT_DIR/quickstart-android
fi
if [ -d "$SCRIPT_DIR/quickstart-ios" ]; then
  ln -s $SCRIPT_DIR/quickstart-ios
fi
if [ -d "$SCRIPT_DIR/rpsls-android" ]; then
  ln -s $SCRIPT_DIR/rpsls-android
fi
if [ -d "$SCRIPT_DIR/rpsls-ios" ]; then
  ln -s $SCRIPT_DIR/rpsls-ios
fi
if [ -d "$SCRIPT_DIR/soapbox-android" ]; then
  ln -s $SCRIPT_DIR/soapbox-android
fi
if [ -d "$SCRIPT_DIR/soapbox-ios" ]; then
  ln -s $SCRIPT_DIR/soapbox-ios
fi

#create the tar!
cd ..
#tar czfh $APP_NAME-$APP_VERSION-$BUILD_NUMBER.tar.gz $APP_NAME/*
zip -r -y $APP_NAME-$APP_VERSION.zip $APP_NAME/*


