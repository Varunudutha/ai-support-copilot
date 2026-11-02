# AI Support Copilot — AI Service

Python/FastAPI service for local AI capabilities. Step 03.1 establishes the
service boundary and health endpoint. The local embedding model and embedding
API are added in later Step 03 patches.

## Requirements

- Python 3.10 or newer
- pip

## Windows PowerShell setup

Run from the repository root:

```powershell
cd ai-service
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```

If activation is blocked, run this for the current terminal only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Start the service

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Health: http://127.0.0.1:8000/health
- API docs: http://127.0.0.1:8000/docs

## Tests

```powershell
python -m pytest -q
```

No external API is called at runtime. The local Sentence Transformers model
will be introduced in a later implementation step.
