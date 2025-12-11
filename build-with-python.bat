@echo off
REM Advanced build script that includes embedded Python runtime
REM This creates a truly standalone package with no dependencies

echo ========================================
echo Building Standalone Package with Python
echo ========================================
echo.
echo This script will:
echo 1. Build the React frontend
echo 2. Download embedded Python runtime
echo 3. Package everything for distribution
echo.
echo WARNING: This will download Python embedded (~50MB)
echo.
pause

REM First run the basic build
call build-standalone.bat
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 7: Downloading Python Embedded
echo ========================================
echo.

set PYTHON_VERSION=3.12.0
set PYTHON_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-embed-amd64.zip

echo Downloading Python %PYTHON_VERSION% embedded...
echo URL: %PYTHON_URL%
echo.

REM Check if curl is available
where curl >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    curl -L -o Distribution\python-embedded.zip "%PYTHON_URL%"
) else (
    echo curl not found. Trying PowerShell...
    powershell -Command "Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile 'Distribution\python-embedded.zip'"
)

if not exist "Distribution\python-embedded.zip" (
    echo WARNING: Failed to download Python embedded
    echo You can manually download it from: %PYTHON_URL%
    echo And extract it to Distribution\python-embedded\
    pause
    exit /b 1
)

echo Extracting Python embedded...
cd Distribution
if exist "python-embedded" (
    rmdir /s /q python-embedded
)
mkdir python-embedded
powershell -Command "Expand-Archive -Path 'python-embedded.zip' -DestinationPath 'python-embedded' -Force"
del python-embedded.zip
cd ..

echo Python embedded extracted!
echo.

echo Step 8: Creating Python launcher...
(
echo @echo off
echo REM Python launcher for standalone mode
echo set PYTHONHOME=%%~dp0python-embedded
echo set PATH=%%PYTHONHOME%%;%%PYTHONHOME%%\Scripts;%%PATH%%
echo python-embedded\python.exe "%%~dp0app\main.py"
) > Distribution\python-launcher.bat

echo.
echo ========================================
echo Build Complete with Python Runtime!
echo ========================================
echo.
echo Distribution package created in: Distribution\
echo.
echo The package includes:
echo - Embedded Python runtime
echo - All application code
echo - Pre-built frontend
echo.
echo Users can run START-APPLICATION.bat without installing Python!
echo.
pause

