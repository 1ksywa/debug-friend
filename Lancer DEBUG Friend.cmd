@echo off
title DEBUG Friend !
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\lanceur.ps1"
if errorlevel 1 pause
