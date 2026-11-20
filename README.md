# Child Safety Web

The application consists of the web interface and server in
`app/childSafetyWeb`, the API in `app/childSafetyBackend`, and the shared
Python package in `packages/python`.

## Local setup

Install Node.js and Python 3.11 or later. From the repository root in
PowerShell:

```powershell
python -m venv .venv
Set-Location app\childSafetyBackend
..\..\.venv\Scripts\python -m pip install -r requirements.txt
```

Configure any environment variables required by your deployment. Run the API
from the backend directory:

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
