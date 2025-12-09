@echo off
echo ========================================
echo Starting Swagger to Postman Converter
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.12+ and try again
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 16+ and try again
    pause
    exit /b 1
)

echo [1/4] Checking Backend dependencies...
cd Backend
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
if not exist "requirements.txt" (
    echo ERROR: requirements.txt not found in Backend folder
    pause
    exit /b 1
)
pip install -q -r requirements.txt
echo Backend dependencies installed.
echo.

echo [2/4] Starting Backend server...
start "Backend Server" cmd /k "cd /d %~dp0Backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 3 /nobreak >nul
echo Backend server starting on http://127.0.0.1:8000
echo.

cd ..
echo [3/4] Checking Frontend dependencies...
cd Frontend
if not exist "node_modules" (
    echo Installing Frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed.
)
echo.

echo [4/4] Starting Frontend application...
start "Frontend Application" cmd /k "cd /d %~dp0Frontend && npm start"
timeout /t 3 /nobreak >nul
echo Frontend application starting on http://localhost:3000
echo.

cd ..
echo ========================================
echo Both applications are starting...
echo ========================================
echo Backend API: http://127.0.0.1:8000
echo Frontend App: http://localhost:3000
echo API Docs: http://127.0.0.1:8000/docs
echo.
echo Press any key to close this window (apps will continue running)
pause >nul
