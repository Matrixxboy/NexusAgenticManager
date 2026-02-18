@echo off
echo === NEXUS Setup ===

echo [1/4] Creating Python virtual environment...
cd backend
python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo [2/4] Setting up environment file...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo Created .env — please fill in your API keys
)

echo [3/4] Installing desktop dependencies...
cd desktop
npm install
cd ..

echo [4/4] Checking Ollama...
ollama --version 2>nul && echo Ollama found || echo WARNING: Ollama not found. Install from https://ollama.com

echo.
echo === Setup complete ===
echo 1. Edit backend\.env with your API keys
echo 2. Run: ollama pull llama3.1:8b
echo 3. Run: scripts\start_bat
echo 4. Run: cd desktop ^&^& npm run tauri dev
