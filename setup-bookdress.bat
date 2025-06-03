@echo off
echo.
echo 🎀 BookDress Docker Setup Script 🎀
echo ====================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not available. Please install Docker Desktop with Compose.
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "api\cdn\bookdress\users" mkdir "api\cdn\bookdress\users"
if not exist "api\cdn\bookdress\dresses" mkdir "api\cdn\bookdress\dresses"
if not exist "api\cdn\bookdress\locations" mkdir "api\cdn\bookdress\locations"
if not exist "api\cdn\bookdress\contracts" mkdir "api\cdn\bookdress\contracts"
if not exist "api\cdn\bookdress\licenses" mkdir "api\cdn\bookdress\licenses"
if not exist "api\cdn\bookdress\temp\users" mkdir "api\cdn\bookdress\temp\users"
if not exist "api\cdn\bookdress\temp\dresses" mkdir "api\cdn\bookdress\temp\dresses"
if not exist "api\cdn\bookdress\temp\locations" mkdir "api\cdn\bookdress\temp\locations"
if not exist "api\cdn\bookdress\temp\contracts" mkdir "api\cdn\bookdress\temp\contracts"
if not exist "api\cdn\bookdress\temp\licenses" mkdir "api\cdn\bookdress\temp\licenses"

echo ✅ Directories created

REM Build and start the application
echo 🚀 Building and starting BookDress application...
echo This may take several minutes on first run...

REM Build the images
docker compose build --no-cache

REM Start the services
docker compose up -d

echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Check if services are running
echo 🔍 Checking service status...
docker compose ps

echo.
echo 🎉 BookDress Setup Complete!
echo ==========================
echo.
echo 📱 Access your applications:
echo    Frontend:        http://localhost:8080
echo    Backend (Admin): http://localhost:3001
echo    API:             http://localhost:4002
echo    MongoDB Express: http://localhost:8084
echo.
echo 🔐 Default Admin Credentials:
echo    Email:    admin@bookdress.local
echo    Password: admin123
echo.
echo ⚠️  IMPORTANT: Change the admin password after first login!
echo.
echo 📋 Next Steps:
echo    1. Go to http://localhost:3001 and login with admin credentials
echo    2. Create suppliers, locations, and dresses
echo    3. Test the frontend at http://localhost:8080
echo.
echo 🛠️  Useful Commands:
echo    Stop:     docker compose down
echo    Restart:  docker compose restart
echo    Logs:     docker compose logs
echo    Rebuild:  docker compose up --build --force-recreate
echo.
echo Happy dress renting! 👗✨
echo.
pause
