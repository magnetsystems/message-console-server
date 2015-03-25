@echo off

setlocal
rem Change the following if it has been changed to use another port
set PORT_TO_CHECK=3000

set check_port=true
set TITLE="MagnetMessagingConsole"
set PROG="mmx-console"
set whichnode=bundle


if "%selfWrapped%"=="" (
  SET selfWrapped=true
  %ComSpec% /s /c ""%~0" %*"
  GOTO :EOF
)

if "-p"=="%1" (
	set check_port=false
	shift
)	

if "start"=="%1" (
	call :start
) else (
	if "stop"=="%1" (
		call :stop
	) else (
		if "restart"=="%1" (
			call :restart
		) else (
			call :print_usage
		)
	)
) 
endlocal
goto :end



:print_usage
	echo Usage: mmx-console.bat [-p] {start^|stop^|restart}
	echo.
	echo Start, stop, or restart the Magnet Mesaging console.
	echo. 
	echo Options:
	echo    -p    No port check when starting.
	echo. 
exit /b



:start
	if %check_port%==true (
		call :check_ports
	)
	call :check_node

	if exist %PROG%.pid (
		echo Error! %PROG% is already running or you have a stale pid file. If %PROG% is not running delete %PROG%.pid file and try again.
		exit 1
	)	
	if bundle==%whichnode% (
		start %TITLE% .\node start.js
	) else ( 
		start %TITLE% node start.js
	)
	timeout /t 3
	FOR /F "usebackq tokens=2" %%i IN (`tasklist /nh /fi "WINDOWTITLE eq %TITLE%"`) DO echo %%i > .\%PROG%.pid
goto :end



:check_ports
	netstat -aon | findstr "%PORT_TO_CHECK%" 1>NUL
	if %ERRORLEVEL% equ 0 (
		echo TCP port "%PORT_TO_CHECK%" is already in use, cannot start messaging server
		exit 1
	)
	echo Using ports "%PORT_TO_CHECK%"
goto :eof



:check_node
	REM check in path
	node -v 1>NUL 2>NUL
	set nodeinpath=%ERRORLEVEL%

	REM for the bundled node
	.\node -v 1>NUL 2>NUL
	set nodebundle=%ERRORLEVEL%

	
	if 0 neq %nodebundle% (
		if 0 neq %nodeinpath% (
			echo node.js is not installed
			echo MMX console needs node.js version 0.10.0 OR higher
			echo Please check https://nodejs.org/download/
			exit 1
		) else (
			echo node.js is installed
			set whichnode=env
		)
	) else (
		echo node.js is available
		set whichnode=bundle
	)
goto :eof



:stop
	set /p pid=<.\%PROG%.pid
	taskkill /f /pid %pid% /t
	del .\%PROG%.pid
goto :end



:restart
	call :stop
	call :start
goto :end



:end