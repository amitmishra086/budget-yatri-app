@echo off
echo Starting Budget Yatri App...
echo.

REM Start backend server in a new window
start "Budget Yatri - Backend" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"

REM Wait 3 seconds so backend gets a head start
timeout /t 3 /nobreak >nul

REM Start frontend server in a new window
start "Budget Yatri - Frontend" cmd /k "cd frontend && python -m http.server 8080"

REM Wait 2 seconds then open the browser automatically
timeout /t 2 /nobreak >nul
start http://localhost:8080

echo.
echo Both servers starting in separate windows.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:8080
echo.
echo Close this window anytime - the two server windows will keep running.
echo To STOP the app, close the two "Budget Yatri" windows that opened.
pause
