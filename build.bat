@echo off
REM Script de build para Vercel (Windows)
cd frontend
if errorlevel 1 exit /b 1
call npm install
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1

