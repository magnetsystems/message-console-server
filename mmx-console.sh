#!/bin/bash

PROG="mmx-console"
PID_PATH="./"
pid=

start() {
	if [ -e "$PID_PATH/$PROG.pid" ]; then
		## Program is running, exit with error.
		echo "Error! $PROG is already running!" 1>&2
		exit 1
	else
		nohup node start.js > mmx-console.out 2>&1& 
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
		echo "Usage: $0 {start|stop|restart}" 1>&2
		exit 1
		;;
esac
