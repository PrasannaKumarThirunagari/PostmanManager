# Technical Architecture
## Swagger to Postman Collection Converter

## Technology Stack

### Backend
- **Python Version**: Python 3.12+ (Latest stable version)
- **Framework**: Python FastAPI (Latest stable version)
- **ASGI Server**: Uvicorn (standard)
- **Data Validation**: Pydantic 2.9+
- **Configuration**: Pydantic Settings 2.5+
- **File Operations**: aiofiles (async file I/O)
- **YAML Parsing**: PyYAML 6.0+
- **Logging**: Python logging module with structured logging support
- **Environment**: Python-dotenv for environment variable management

### Frontend
- **Framework**: React 18.3+ (Latest stable version)
- **UI Library**: Bootstrap 5.3+ with React Bootstrap 2.10+
- **Icons**: Bootstrap Icons 1.11+
- **Routing**: React Router DOM 6.26+
- **State Management**: React Context API
- **HTTP Client**: Axios 1.7+
- **Build Tool**: Create React App 5.0+
- **Navigation**: Left sidebar navigation with Bootstrap components

## Backend Architecture

### Architecture Principles

**All backend code MUST be**:
- Built using **Python FastAPI** (RESTful API architecture)
- Follow **Clean Architecture** principles
- Implement **SOLID** principles
- Use **Repository Pattern** for data access
- Implement **Dependency Injection** throughout (using FastAPI's dependency injection system)
- Follow **CQRS** pattern where applicable
- Use **Service Layer Pattern** for business logic separation

### Service Layer Architecture

```
Controllers (API Layer - FastAPI Routes)
      ↓
Services (Business Logic)
      ↓
Repositories (Data Access)
      ↓
Models/Entities (Domain Models)
```

### Reusable Components

1. **Swagger Parser Service**: Reusable across all Swagger versions
2. **Postman Collection Builder**: Reusable for all collection versions
3. **Variable Extractor Service**: Extract and manage dynamic variables
4. **Security Test Generator Service**: Generate security test variants
5. **File Handler Service**: Handle file operations
6. **Validation Service**: Validate inputs and Swagger formats

### Interface-Based Design
- Define abstract base classes (ABC) for all services
- Enable easy mocking and testing
- Allow for future implementations/extensions
- Support dependency injection through FastAPI's dependency system

## Project Structure

**Complete Project Structure**:

```
Project Root/
├── Backend/                              # Python FastAPI Backend
│   ├── app/                              # Main application package
│   │   ├── __init__.py
│   │   ├── main.py                      # FastAPI application entry point
│   │   ├── config.py                    # Configuration settings (Pydantic)
│   │   ├── dependencies.py              # Dependency injection setup
│   │   ├── api/                          # API routes
│   │   │   ├── __init__.py
│   │   │   ├── v1/                       # API version 1
│   │   │   │   ├── __init__.py
│   │   │   │   ├── swagger.py           # Swagger endpoints
│   │   │   │   ├── collections.py       # Collection endpoints
│   │   │   │   ├── conversions.py        # Conversion endpoints
│   │   │   │   └── health.py            # Health check endpoint
│   │   ├── application/                  # Business Logic Layer
│   │   │   ├── __init__.py
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── swagger_parser_service.py
│   │   │   │   ├── postman_collection_service.py
│   │   │   │   ├── security_test_service.py
│   │   │   │   └── variable_extractor_service.py
│   │   │   ├── interfaces/
│   │   │   ├── dtos/
│   │   │   └── mappers/
│   │   ├── domain/                       # Domain Models
│   │   │   ├── __init__.py
│   │   │   ├── entities/
│   │   │   ├── value_objects/
│   │   │   └── enums/
│   │   ├── infrastructure/               # Infrastructure Layer
│   │   │   ├── __init__.py
│   │   │   ├── parsers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── openapi31_parser.py
│   │   │   │   ├── openapi30_parser.py
│   │   │   │   └── swagger20_parser.py
│   │   │   ├── builders/
│   │   │   │   ├── __init__.py
│   │   │   │   └── postman_collection_builder.py
│   │   │   ├── file_handlers/
│   │   │   └── validators/
│   │   └── shared/                       # Shared Utilities
│   │       ├── __init__.py
│   │       ├── helpers/
│   │       ├── extensions/
│   │       └── constants/
│   ├── requirements.txt                  # Python dependencies (Python 3.12+)
│   ├── .env.example                      # Environment variables template
│   ├── .env                              # Environment variables (gitignored)
│   ├── pyproject.toml                    # Project configuration (optional)
│   ├── README.md                         # Backend documentation
│   └── Dockerfile                        # Docker configuration (optional)
│
├── Frontend/                            # React Frontend
│   ├── src/
│   │   ├── config/
│   │   │   └── api.config.js           # API configuration
│   │   ├── services/
│   │   │   └── api.service.js          # API service with CORS
│   │   ├── utils/
│   │   │   └── corsErrorHandler.js     # CORS error handling
│   │   ├── hooks/
│   │   │   └── useApi.js               # API hooks with CORS
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   ├── .env                            # Environment variables
│   ├── .env.example                    # Environment template
│   └── README.md                       # Frontend documentation
│
└── ProjectDetails.md                   # Main project documentation
```

### Project Dependencies Diagram

```
API Layer (FastAPI Routes)
├── Application Layer
│   ├── Domain Layer
│   └── Shared Layer
├── Infrastructure Layer
│   ├── Domain Layer
│   ├── Application Layer
│   └── Shared Layer
├── Domain Layer
└── Shared Layer
```

## Performance Optimization

### Async Operations
- All file I/O operations must be async
- Use `async/await` throughout
- Avoid blocking calls
- Use `asyncio.gather()` or `asyncio.create_task()` for parallel operations

### Memory Management
- Use streaming for large file processing
- Implement proper context managers (with statements)
- Avoid memory leaks
- Use generators for large data processing

### Caching
- Cache parsed Swagger files (in-memory cache)
- Cache generated collections temporarily
- Implement cache invalidation strategies
- Use distributed cache for scalability (optional - Redis)

### Parallel Processing
- Process multiple Swagger files in parallel
- Generate security variants in parallel
- Use `asyncio.gather()` or `asyncio.create_task()` for independent operations
- Implement proper concurrency control

### Resource Management
- Use context managers (with statements) for proper resource disposal
- Limit concurrent file operations
- Implement request throttling (using slowapi or similar)
- Monitor resource usage

### Response Optimization
- Implement pagination for large result sets
- Use compression for API responses (GZip)
- Minimize data transfer
- Implement response caching where appropriate

## CORS (Cross-Origin Resource Sharing) Configuration

**MUST implement CORS throughout the application**:

### Backend CORS Configuration
- Configure CORS middleware in FastAPI
- Allow specific origins (React frontend URL)
- Allow necessary HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
- Allow necessary headers (Content-Type, Authorization, etc.)
- Handle preflight requests (OPTIONS)
- Support credentials if needed

### Frontend CORS Handling
- Configure API base URL
- Handle CORS errors gracefully
- Set appropriate headers in requests
- Handle preflight requests automatically

### Environment-Specific CORS
- Development: Allow localhost with different ports
- Production: Allow specific production domain
- Staging: Allow staging domain

### CORS Implementation Details

**Backend CORS Setup** (FastAPI):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # or specific methods
    allow_headers=["*"],  # or specific headers
)
```

**Frontend CORS Handling**:
```javascript
// All requests include CORS mode and credentials
const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
});
```

### CORS Configuration Files

- **Backend**:
  - `Backend/app/main.py` - FastAPI application with CORS middleware
  - `Backend/app/config.py` - CORS settings (Pydantic Settings)
  - `Backend/.env` - Environment-specific CORS origins

- **Frontend**:
  - `Frontend/src/config/api.config.js` - API configuration with base URL
  - `Frontend/src/services/api.service.js` - Centralized API service with CORS handling
  - `Frontend/src/utils/corsErrorHandler.js` - CORS error handling utility
  - `Frontend/src/hooks/useApi.js` - Custom React hooks with CORS error handling
  - `Frontend/.env` - Environment variables for API URL configuration

## Error Handling Architecture

### Error Handling Strategy
- Use custom exception classes
- Implement global exception handlers in FastAPI
- Return appropriate HTTP status codes
- Provide meaningful error messages
- Log all errors appropriately

### Custom Exception Classes
```python
class SwaggerParseError(Exception):
    """Raised when Swagger file parsing fails"""
    pass

class PostmanCollectionError(Exception):
    """Raised when Postman collection generation fails"""
    pass

class ValidationError(Exception):
    """Raised when validation fails"""
    pass
```

### Global Exception Handler
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "detail": exc.detail}
    )
```

## Configuration Management

### Configuration Strategy
- Use **Pydantic Settings** for configuration management
- Support environment-specific configurations (using .env files or environment variables)
- Use **Pydantic BaseSettings** for strongly-typed configuration
- Support configuration validation through Pydantic models

### Configuration Example
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Swagger to Postman Converter"
    cors_origins: list[str] = ["http://localhost:3000"]
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_file_types: list[str] = [".json", ".yaml", ".yml"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```

## Logging Architecture

### Logging Strategy
- Use Python's built-in logging module
- Implement structured logging (with python-json-logger if needed)
- Log all important operations
- Include correlation IDs for request tracking
- Log performance metrics

### Logging Configuration
```python
import logging
from pythonjsonlogger import jsonlogger

# Configure structured logging
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

## API Documentation

### API Documentation Strategy
- Use FastAPI's built-in OpenAPI/Swagger documentation
- Document all endpoints with docstrings
- Include request/response examples
- Document error responses
- Use Pydantic models for request/response schemas

### FastAPI Documentation
- Automatic OpenAPI schema generation
- Interactive API documentation at `/docs`
- ReDoc documentation at `/redoc`

## Frontend Architecture

### UI Components Structure
- **Layout Components**: Sidebar, Header, MainContent
- **Feature Components**: Swagger upload, Collection viewer, Environment manager
- **Common Components**: Buttons, Modals, Forms, Tables
- **Bootstrap Integration**: Use React Bootstrap components for consistent styling

### Navigation Architecture
- Left sidebar navigation with Bootstrap styling
- Collapsible menu items
- Active route highlighting
- Responsive: collapses to hamburger menu on mobile
- Icons from Bootstrap Icons library

### State Management
- React Context API for global state
- Local component state for UI interactions
- No external state management library required

### Offline-First Architecture
- All API calls to local backend (127.0.0.1:8000)
- No external API dependencies
- Error handling for offline scenarios
- Local file system operations only
- No cloud services or external dependencies

## Offline-First Architecture

### Local Development and Deployment
- **Backend**: Runs locally on http://127.0.0.1:8000
- **Frontend**: Runs locally on http://localhost:3000
- **Communication**: Frontend communicates with local backend only
- **No External Dependencies**: All functionality works offline
- **File Storage**: Local file system only
- **Data Persistence**: Local file system storage

### Running the Application
- Use `start-apps.bat` to launch both backend and frontend
- Backend starts first on port 8000
- Frontend starts on port 3000 and proxies to backend
- Both applications run in separate command windows
- No internet connection required for operation

### Local File Structure
- All Swagger files stored in `SwaggerFiles/` directory
- Generated collections in `PostmanCollection/` directory
- Environment files in `Environments/` directory
- All operations are local file system based

## Security Architecture

### Security Measures
- Input validation at API boundaries
- File upload security (size limits, type validation)
- Rate limiting
- HTTPS enforcement
- Authentication/Authorization (if required)
- Secure file storage

### Input Validation
- Validate all file uploads
- Sanitize file names
- Validate file sizes
- Check file types
- Scan for malicious content (optional)

### API Security
- Implement authentication/authorization (if required)
- Use HTTPS only
- Implement rate limiting
- Validate all inputs
- CORS configuration
