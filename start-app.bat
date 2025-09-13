@echo off
echo Starting Job Application Support App...
echo.

echo Starting backend server...
cd backend
start "Backend Server" cmd /k python main.py

echo Starting frontend server...
cd ../frontend
start "Frontend Server" cmd /k npm start

echo Both servers are starting in separate windows!
pause