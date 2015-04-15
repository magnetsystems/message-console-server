@echo off

rem Please change .\startup.properties if you would like to use ports other than the default ones.
rem For detail, please reference the troubleshooting guide.

setlocal

if "%selfWrapped%"=="" (
  SET selfWrapped=true
  %ComSpec% /s /c ""%~0" %*"
  GOTO :EOF
)

set check_port=true
set TITLE="Administrationwebinterface"
set PROGNAME="Administration web interface"
set PROG="mmx-console"
set whichnode=bundle



call :check2Args %*

call :loadPorts ..\startup.properties

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
	echo Start, stop, or restart the %PROGNAME%.
	echo. 
	echo Options:
	echo    -p    No port check when starting.
	echo.
	pause
exit /b



:start
	if %check_port%==true (
		call :check_port_list %consolePort%
		echo. 
	)

	call :check_node

	if exist %PROG%.pid (
		echo.
		echo Error! %PROGNAME% is already running or you have a stale pid file. If %PROGNAME% is not running, then please delete mmx-standalone-dist-win\console\mmx-console.pid file and try again.
		exit 1
	)	

	if bundle==%whichnode% (
		start %TITLE% .\node start.js
	) else ( 
		start %TITLE% node start.js
	)

	timeout /t 3 >nul

	FOR /F "usebackq tokens=2" %%i IN (`tasklist /nh /fi "WINDOWTITLE eq %TITLE%"`) DO echo %%i > .\%PROG%.pid
	set /p pid=<.\%PROG%.pid
	if "No "=="%pid%" (
		if bundle==%whichnode% (
			echo Error starting the web interface. It could be an environment issue. Please execute .\node start.js and fix the environment accordingly.
		) else ( 
			echo Error starting the web interface. It could be an environment issue. Please execute node start.js and fix the environment accordingly.
		)
		del .\%PROG%.pid
		exit 1
	)
goto :end



:check2Args
	setlocal EnableDelayedExpansion
	FOR %%A in (%*) DO (
	        SET /A args_count+=1
	        if !args_count! equ 3 (
	                call :print_usage
	                exit
	        )
	)

	if !args_count! equ 0 (
	        call :print_usage
	        exit
	)
	endlocal
goto :eof



:loadPorts
	FOR /F "eol=; tokens=2 delims==" %%i IN ('findstr /i "consolePort=" %1') do SET consolePort=%%i
	FOR /F "eol=; tokens=2 delims==" %%i IN ('findstr /i "httpPort=" %1') do SET httpPort=%%i
goto :eof



:check_port
        netstat -aon | findstr "%1" 1>NUL
        if %ERRORLEVEL% equ 0 (
                echo.
                echo Error! TCP port "%1" is already in use; thus, cannot start %PROGNAME%. Please refer to readme.htm on how to change the ports.
                exit 1
        )
        echo Validated port "%1"
goto :eof



:check_port_list
	for %%a in (%*) do (
        	call :check_port %%a
	)
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
		echo %PROGNAME% is not running
	)
	endlocal
goto :end



:restart
	call :stop
	call :start
goto :end



:end