#!/bin/bash

# Change the following if it has been changed to use another port

source startup.properties

check_port=true
foreground=false

PROG="mmx-console"
PID_PATH="./"
pid=

check_port() {
	if nc -z 127.0.0.1 $1 > /dev/null; then
		echo "ERROR: TCP port $1 is already in use, cannot start messaging server"
		exit 1
	else
		echo "validated port $1"
	fi
}

check_port_list() {
	portList=( "$@" );
	for i in "${portList[@]}"; do
		check_port $i
	done
}


check_cmd() {
	type "$1" &> /dev/null;
}

check_node() {
	if check_cmd node || check_cmd nodejs || [ -e node*/bin/node ] ; then
		echo "node.js is installed"
	else
		echo "node.js is not installed"
		echo "MMX console needs node.js version 10.0 OR higher"
		echo "Please check http://nodejs.org/download/"
		exit 1
	fi
}


start() {
	if [ -e "$PID_PATH/$PROG.pid" ]; then
		## Program is running, exit with error.
		echo "Error! $PROG is already running or you have a stale pid file. If $PROG is not running, then please delete $PROG.pid in the console directory and try again." 1>&2
		exit 1
	else
		if [ $check_port == true ]; then
			check_port_list $consolePort
		fi
		check_node
		if type -p nodejs >/dev/null; then
	        if [ true == $foreground ] ; then
			    exec nohup nodejs start.js > mmx-console.out 2>&1
	        else
			    nohup nodejs start.js > mmx-console.out 2>&1&
			fi
		else
			if type -p node >/dev/null; then
				if [ true == $foreground ] ; then
					exec nohup node start.js > mmx-console.out 2>&1
				else
					nohup node start.js > mmx-console.out 2>&1&
				fi	
			else
				echo "Error! Neither node nor nodejs is in the path. Please correct that and try again. " 1>&2
				exit 1
			fi
		fi
		touch "$PID_PATH/$PROG.pid"
		pid=$!
		echo $pid >> $PID_PATH/$PROG.pid
	fi
}

stop() {
	if [ -e "$PID_PATH/$PROG.pid" ]; then
		pid=$(<$PID_PATH/$PROG.pid)
		kill -SIGTERM $pid

		rm "$PID_PATH/$PROG.pid"

		echo "$PROG stopped"
	else
		## Program is not running, exit with error.
		echo "stop:$PROG :  $PROG is not running" 1>&2
	fi
}

print_usage() {
	echo "Usage: mmx-console.sh [-p] [-f] {start|stop|restart}" >&2
	echo >&2
	echo "Start, stop, or restart the Magnet Messaging console." >&2
	echo >&2
	echo "Options:" >&2
	echo "    [-p]    No port check when starting." >&2
	echo "    [-f]    Run in foreground mode for Docker" >&2
	echo >&2
}

if [ "$#" == 0 ] || [ "$#" -gt 3 ] ; then
	print_usage
	exit 1
fi

while getopts "p h f" opt; do
	case $opt in
		p)
			check_port=false
			;;
		f)
			foreground=true
			;;
		h)
			print_usage
			exit 1
			;;
		\?)
			print_usage
			exit 1
			;;
	esac
done

shift $((OPTIND-1))

case "$1" in
	start)
		start
		exit 0
		;;
	stop)
		stop
		exit 0
		;;
	restart)
		stop
		start
		exit 0
		;;
	**)
		print_usage
		exit 1
		;;
esac
