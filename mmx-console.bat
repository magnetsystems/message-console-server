@echo off



setlocal

if "%selfWrapped%"=="" (
  SET selfWrapped=true
  %ComSpec% /s /c ""%~0" %*"
  GOTO :EOF
)

set TITLE="MagnetMessagingConsole"
set PROG="mmx-console"



if "start"=="%1" (
	call :start
) else (
	if "stop"=="%1" (
		call :stop
	) else (
		if "restart"=="%1" (
			call :restart
		) else (
			echo Usage: %0 {start^|stop^|restart}
			exit /b
		)
	)
) 
endlocal
goto :end



:start
	if exist %PROG%.pid (
		echo Error! %PROG% is already running or you have a stale pid file. If %PROG% is not running delete %PROG%.pid file and restart"
		exit /b 1
	)	
	start %TITLE% node start.js	
	FOR /F "usebackq tokens=2" %%i IN (`tasklist /nh /fi "WINDOWTITLE eq %TITLE%"`) DO echo %%i > .\%PROG%.pid
goto :end



:stop
	del .\%PROG%.pid
	taskkill /f /im node.exe /t
goto :end



:restart
	call :stop
	call :start
goto :end



:end
