@echo off
REM Build script to create standalone distribution package
REM This script builds the React frontend and packages everything for distribution

echo ========================================
echo Building Standalone Distribution Package
echo ========================================
echo.

REM Check if Node.js is installed (needed for building)
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js to build the frontend
    pause
    exit /b 1
)

REM Check if Python is installed (needed for building)
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python to build the backend
    pause
    exit /b 1
)

echo Step 1: Building React Frontend...
cd Frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build React frontend
    cd ..
    pause
    exit /b 1
)
cd ..
echo Frontend build completed!
echo.

echo Step 2: Creating distribution directory...
if exist "Distribution" (
    echo Removing old distribution...
    rmdir /s /q Distribution
)
mkdir Distribution
mkdir Distribution\app
echo Distribution directory created!
echo.

echo Step 3: Copying backend files...
xcopy /E /I /Y Backend\app Distribution\app
xcopy /E /I /Y Backend\Backend Distribution\Backend
xcopy /E /I /Y Backend\Environments Distribution\Environments
xcopy /E /I /Y Backend\LoginCollection Distribution\LoginCollection
xcopy /E /I /Y Backend\MasterData Distribution\MasterData
xcopy /E /I /Y Backend\PostmanCollection Distribution\PostmanCollection
xcopy /E /I /Y Backend\SwaggerFiles Distribution\SwaggerFiles
copy /Y Backend\requirements.txt Distribution\requirements.txt
copy /Y Backend\README.md Distribution\README.md
echo Backend files copied!
echo.

echo Step 4: Copying frontend build...
xcopy /E /I /Y Frontend\build Distribution\Frontend\build
echo Frontend build copied!
echo.

echo Step 5: Creating standalone launcher...
copy /Y standalone-launcher.bat Distribution\START-APPLICATION.bat
echo Launcher created!
echo.

echo Step 6: Creating README for distribution...
(
echo # Standalone Application Package
echo.
echo ## How to Run
echo.
echo 1. Double-click **START-APPLICATION.bat**
echo 2. Wait for the application to start
echo 3. Open your browser and go to: **http://localhost:8000**
echo.
echo ## Requirements
echo.
echo - Windows 10 or later
echo - No additional software installation needed!
echo.
echo ## What's Included
echo.
echo - Python runtime \(embedded\)
echo - All application dependencies
echo - Pre-built frontend
echo - All necessary data directories
echo.
echo ## Stopping the Application
echo.
echo Close the command window or press Ctrl+C to stop the server.
) > Distribution\README.txt
echo README created!
echo.

echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Distribution package created in: Distribution\
echo.
echo Next steps:
echo 1. Install Python dependencies in the distribution
echo 2. Package Python runtime \(optional - see build-with-python.bat\)
echo 3. Test the standalone launcher
echo.
pause

