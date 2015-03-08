#!/bin/bash

# Change the following if it has been changed to use another port
PORT_TO_CHECK=3000

check_port=true

PROG="mmx-console"
PID_PATH="./"
pid=

check_ports() {
    if lsof -Pi :$PORT_TO_CHECK -sTCP:LISTEN -t >/dev/null ; then
        echo "TCP port $PORT_TO_CHECK is already in use, cannot start console"
        exit 1
    else
        echo
        echo "Using ports $PORT_TO_CHECK"
        echo
    fi
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
		echo "Error! $PROG is already running or you have a stale pid file. If $PROG is not running delete $PID_PATH/$PROG.pid file and restart" 1>&2
		exit 1
	else
            if [ $check_port == true ]; then
                check_ports
            fi
            check_node
	    	if type -p nodejs >/dev/null; then
                nohup nodejs start.js > mmx-console.out 2>&1&
            else
	                if type -p node >/dev/null; then
       		                 nohup node start.js > mmx-console.out 2>&1&		
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
    echo "Usage: mmx-console.sh [-p] {start|stop|restart}" >&2
    echo >&2
    echo "Start, stop, or restart the Magnet Messaging console." >&2
    echo >&2
    echo "Options:" >&2
    echo "    [-p]    No port check when starting." >&2
    echo >&2
}

if [ "$#" == 0 ] || [ "$#" -gt 2 ] ; then
    print_usage
    exit 1
fi

while getopts "p h" opt; do
    case $opt in
    p)
        check_port=false
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
