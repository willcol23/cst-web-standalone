# Child Safety Web

The application consists of the web interface and server in
`app/childSafetyWeb`, the API in `app/childSafetyBackend`, and the shared
Python package in `packages/python`.

## Local setup

Install Node.js, Python 3.11 or later, and a MongoDB instance accessible to the
API. From the repository root in PowerShell:

```powershell
python -m venv .venv
Set-Location app\childSafetyBackend
..\..\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit the new `.env` file to configure `MONGODB_URI` and `MONGODB_DB`. The API
checks the MongoDB connection at startup. Run it from the backend directory:

```powershell
..\..\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

In another terminal, from the repository root:

```powershell
Set-Location app\childSafetyWeb
npm.cmd ci
npm.cmd start
```

Open `http://localhost:3000`. The web server creates its `uploads` directory
when it starts. Keep environment files and uploaded data private.

To run the shared-package tests, install the test dependencies and run pytest
from the repository root:

```powershell
.\.venv\Scripts\python -m pip install "pytest>=8,<9" pytest-asyncio
.\.venv\Scripts\python -m pytest packages\python\tests
```
