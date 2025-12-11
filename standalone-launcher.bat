@echo off
REM Standalone Application Launcher
REM This script starts the application in standalone mode

echo ========================================
echo Starting Swagger to Postman Converter
echo ========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Check if we're in standalone mode (Frontend/build exists)
set STANDALONE_MODE=false
if exist "Frontend\build\index.html" (
    set STANDALONE_MODE=true
    echo Running in STANDALONE MODE
    echo Frontend will be served from built files
) else (
    echo Running in DEVELOPMENT MODE
    echo Frontend should be running separately on port 3000
)
echo.

REM Note: Standalone mode is auto-detected by checking for Frontend\build directory
REM No environment variable needed

REM Check if Python is available
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not found in PATH
    echo.
    echo Please ensure Python is installed and added to PATH
    echo OR use the version with embedded Python runtime
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists, if not create it
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Install/upgrade dependencies
echo Checking dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some dependencies may have failed to install
    echo Continuing anyway...
)

REM Set working directory to app folder
cd app

REM Start the application
echo.
echo ========================================
echo Starting Application Server...
echo ========================================
echo.
if "%STANDALONE_MODE%"=="true" (
    echo Running in STANDALONE MODE
    echo Application will be available at: http://localhost:8000
) else (
    echo Running in DEVELOPMENT MODE
    echo API will be available at: http://localhost:8000
    echo Frontend should be running separately on port 3000
)
echo.
echo Press Ctrl+C to stop the server
echo.

python -m uvicorn main:app --host 127.0.0.1 --port 8000

REM If we get here, the server stopped
echo.
echo Server stopped.
pause

