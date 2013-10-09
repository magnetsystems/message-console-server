#/usr/bin/bash

#find script dir
#SCRIPT_DIR="`dirname \"$0\"`"; SCRIPT_DIR="`( cd \"$SCRIPT_DIR\" && pwd )`"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR

# "build"
npm install

# test
nohup node app.js &
export NODEJS_PID=$!
./node_modules/.bin/jasmine-node spec/
kill $NODEJS_PID

# package
mkdir target 
cd target
git clone git@bitbucket.org:magneteng/docs.git

APP_NAME=`./jp.py '["name"]'`
APP_VERSION=`./jp.py '["version"]'`

mkdir $APP_NAME-$APP_VERSION
cd $APP_NAME-$APP_VERSION

#devex stuff
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

#generated from install
ln -s $SCRIPT_DIR/node_modules

#doc stuff
ln -s $SCRIPT_DIR/docs/web


