# Backend - Swagger to Postman Converter

Python FastAPI backend for converting Swagger/OpenAPI specifications to Postman collections.

## Requirements

- Python 3.12+
- Virtual environment (recommended)

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file from `.env.example`:
```bash
copy .env.example .env
```

4. Run the application:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Or use the batch file from project root:
```bash
start-apps.bat
```

## API Documentation

Once running, visit:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Project Structure

```
Backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration settings
│   ├── api/
│   │   └── v1/
│   │       ├── health.py    # Health check
│   │       ├── swagger.py   # Swagger file management
│   │       ├── collections.py # Postman collections
│   │       └── conversions.py # Conversion endpoints
│   └── ...
├── requirements.txt
└── README.md
```
