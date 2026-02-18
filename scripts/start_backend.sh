#!/bin/bash
echo "Starting NEXUS .."
cd backend
source .venv/bin/activate
uvicorn api.main:app --reload --port 8000 --host 0.0.0.0
