#/usr/bin/bash

### INIT ###
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR
APP_NAME=`$SCRIPT_DIR/jp.py $SCRIPT_DIR/package.json '["name"]'`
APP_VERSION=`$SCRIPT_DIR/jp.py $SCRIPT_DIR/package.json '["version"]'`


### BUILD ###
npm install


### TEST ###

#DB setup; developercenter needed by app; developercentertest needed for tests
mysql -u root -e 'drop database if exists developercenter;'
mysql -u root -e 'create database developercenter;'
mysql -u root -e 'drop database if exists developercentertest;'
mysql -u root -e 'create database developercentertest;'

#start app and run tests
nohup node app.js &
export NODEJS_PID=$!
./node_modules/.bin/jasmine-node spec/
kill $NODEJS_PID

### PACKAGE ###
# collect temp files in target dir  (maven standard)
mkdir -p target/tmp
cd target/tmp

#doc files
git clone git@bitbucket.org:magneteng/docs.git

# jar file groupId:artifactId:version[:packaging][:classifier]
mvn  --s /var/lib/jenkins/mvn_homes/pse_developer/settings.xml -Dartifact=com.magnet.tools:magnet-tools-cli:2.1.0-SNAPSHOT:zip:install -DremoteRepositories=http://nexus1.magnet.com:8081/nexus/content/groups/pse_developer/ -Dmdep.useBaseVersion=true -DoutputDirectory=. org.apache.maven.plugins:maven-dependency-plugin:2.8:copy
mv magnet-tools-cli-2.1.0-SNAPSHOT-install.zip mab.zip

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
ln -s $SCRIPT_DIR/target/docs/web
mkdir -p public/resources/files
ln -s $SCRIPT_DIR/mab.zip public/resources/files/mab.zip

#create the tar!
cd ..
tar czfh $APP_NAME-$APP_VERSION.tar.gz $APP_NAME-$APP_VERSION/*


