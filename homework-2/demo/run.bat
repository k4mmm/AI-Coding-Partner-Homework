@echo off
setlocal
set PORT=%PORT%
if "%PORT%"=="" set PORT=3000
cd /d "%~dp0.."
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
set NODE_ENV=development
node src/server.js
endlocal
