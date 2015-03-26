@echo off

setlocal
rem Change the following if it has been changed to use another port
set PORT_TO_CHECK=3000

set check_port=true
set TITLE="MagnetMessageConsole"
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
	echo Start, stop, or restart the Magnet Message console.
	echo. 
	echo Options:
	echo    -p    No port check when starting.
	echo. 
exit /b



:start
	if %check_port%==true (
		call :check_ports
		echo. 
	)
	call :check_node

	if exist %PROG%.pid (
		echo.
		echo Error! Magnet Message console is already running or you have a stale pid file. If Magnet Message console is not running, then please delete mmx-standalone-dist-win\console\mmx-console.pid file and try again.
		exit 1
	)	
	if bundle==%whichnode% (
		start %TITLE% .\node start.js
	) else ( 
		start %TITLE% node start.js
	)
	timeout /t 3 >nul
	FOR /F "usebackq tokens=2" %%i IN (`tasklist /nh /fi "WINDOWTITLE eq %TITLE%"`) DO echo %%i > .\%PROG%.pid
goto :end



:check_ports
	netstat -aon | findstr "%PORT_TO_CHECK%" 1>NUL
	if %ERRORLEVEL% equ 0 (
		echo.
		echo Error! TCP port "%PORT_TO_CHECK%" is already in use; thus, cannot start Magnet Message. Please refer to readme.htm on how to change the ports.
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
			set whichnode=env
		)
	) else (
		set whichnode=bundle
	)
goto :eof



:stop
	setlocal EnableDelayedExpansion
	if exist .\%PROG%.pid (
		set /p pid=<.\%PROG%.pid
		taskkill /f /pid !pid! /t >nul
		del .\%PROG%.pid
	) else (
		echo Magnet Message console is not running
	)
	endlocal
goto :end



:restart
	call :stop
	call :start
goto :end



:end