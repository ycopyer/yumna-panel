#!/bin/bash
PORT=5000
echo "[YUMNA-SERVICE] Checking for processes on port $PORT..."

PID=$(lsof -t -i:$PORT)
if [ -n "$PID" ]; then
    echo "[YUMNA-SERVICE] Killing zombie process PID: $PID"
    kill -9 $PID
fi

echo "[YUMNA-SERVICE] Restarting Yumna Panel Server..."
cd "$(dirname "$0")"
npm start
