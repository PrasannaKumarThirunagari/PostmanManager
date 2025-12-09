# Rules and Standards
## Swagger to Postman Collection Converter

## Code Quality Requirements

### Python Coding Standards

1. **PEP 8 Compliance**:
   - Follow PEP 8 Python coding conventions and style guidelines
   - Use meaningful variable and function names (snake_case)
   - Use meaningful class names (PascalCase)
   - Constants should be in UPPER_SNAKE_CASE
   - Private methods/attributes should start with underscore (_)

2. **Code Documentation**:
   - Implement comprehensive **docstrings** (Google or NumPy style)
   - Document all public functions, classes, and modules
   - Include parameter descriptions, return types, and exceptions
   - Document complex algorithms and business logic
   - Include usage examples in docstrings

3. **Code Formatting**:
   - Maintain **consistent code formatting** (use Black formatter)
   - Maximum line length: 88-100 characters (Black default)
   - Use proper indentation (4 spaces, no tabs)
   - Consistent spacing around operators and commas

4. **Type Hints**:
   - Use type hints for all function parameters and return types
   - Use `typing` module for complex types (List, Dict, Optional, etc.)
   - Use `from __future__ import annotations` for forward references (Python 3.7+)

5. **Error Handling**:
   - Use **async/await** for all I/O operations
   - Implement proper **error handling** with custom exceptions
   - Use context managers (with statements) for resource management
   - Never use bare `except:` clauses

### Example Code Style

```python
from typing import List, Optional, Dict, Any
from abc import ABC, abstractmethod

class SwaggerParserService(ABC):
    """
    Abstract base class for Swagger parser services.
    
    This class defines the interface for parsing Swagger/OpenAPI
    specifications into internal data structures.
    
    Args:
        file_path: Path to the Swagger file
        
    Raises:
        SwaggerParseError: If parsing fails
        FileNotFoundError: If file doesn't exist
    """
    
    @abstractmethod
    async def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a Swagger/OpenAPI specification file.
        
        Args:
            file_path: Path to the Swagger file
            
        Returns:
            Dictionary containing parsed Swagger data
            
        Raises:
            SwaggerParseError: If parsing fails
        """
        pass
```

## Design Patterns

### Required Design Patterns

1. **Factory Pattern**: 
   - For creating Swagger parsers based on version
   - Factory class to instantiate appropriate parser

2. **Strategy Pattern**: 
   - For different conversion strategies
   - Different strategies for different Swagger versions

3. **Builder Pattern**: 
   - For constructing Postman collections
   - Step-by-step construction of complex objects

4. **Adapter Pattern**: 
   - For version compatibility
   - Adapt Swagger 2.0 to OpenAPI 3.0 format

5. **Observer Pattern**: 
   - For progress tracking
   - Notify observers of conversion progress

6. **Repository Pattern**:
   - For data access abstraction
   - Separate data access logic from business logic

7. **Dependency Injection**:
   - Use FastAPI's dependency injection system
   - Inject dependencies through function parameters
   - Enable easy testing and mocking

### Design Pattern Examples

**Factory Pattern**:
```python
class ParserFactory:
    @staticmethod
    def create_parser(version: str) -> SwaggerParserService:
        if version.startswith("3.1"):
            return OpenAPI31Parser()
        elif version.startswith("3.0"):
            return OpenAPI30Parser()
        elif version.startswith("2.0"):
            return Swagger20Parser()
        else:
            raise ValueError(f"Unsupported version: {version}")
```

**Builder Pattern**:
```python
class PostmanCollectionBuilder:
    def __init__(self):
        self.collection = {}
    
    def set_name(self, name: str) -> 'PostmanCollectionBuilder':
        self.collection['info'] = {'name': name}
        return self
    
    def add_request(self, request: Dict) -> 'PostmanCollectionBuilder':
        if 'item' not in self.collection:
            self.collection['item'] = []
        self.collection['item'].append(request)
        return self
    
    def build(self) -> Dict:
        return self.collection
```

## SOLID Principles

### Single Responsibility Principle (SRP)
- Each class should have one reason to change
- Separate concerns: parsing, building, validation, etc.

### Open/Closed Principle (OCP)
- Open for extension, closed for modification
- Use abstract base classes and interfaces
- Allow new parsers without modifying existing code

### Liskov Substitution Principle (LSP)
- Derived classes must be substitutable for their base classes
- All parser implementations must follow the same interface

### Interface Segregation Principle (ISP)
- Clients should not depend on interfaces they don't use
- Create specific interfaces for specific needs

### Dependency Inversion Principle (DIP)
- Depend on abstractions, not concretions
- Use dependency injection throughout
- High-level modules should not depend on low-level modules

## Best Practices

### 1. Code Organization

**Modular Design**:
- Separate concerns into distinct modules/layers
- Create reusable service classes
- Implement shared utilities and helpers
- Use base classes for common functionality

**Layer Separation**:
- API Layer: FastAPI routes and request/response handling
- Application Layer: Business logic and services
- Domain Layer: Domain models and entities
- Infrastructure Layer: External integrations and implementations
- Shared Layer: Common utilities and helpers

### 2. Error Handling

**Error Handling Rules**:
- Use custom exception classes
- Implement global exception middleware
- Return appropriate HTTP status codes
- Provide meaningful error messages
- Log all errors appropriately
- Never expose internal error details to clients

**Custom Exception Example**:
```python
class SwaggerParseError(Exception):
    """Raised when Swagger file parsing fails"""
    def __init__(self, message: str, detail: Optional[str] = None):
        self.message = message
        self.detail = detail
        super().__init__(self.message)
```

### 3. Validation

**Validation Rules**:
- Validate all inputs at API boundaries
- Use Pydantic models for request/response validation
- Validate Swagger file format before processing
- Validate Postman collection structure before saving
- Provide clear validation error messages

**Pydantic Validation Example**:
```python
from pydantic import BaseModel, validator

class SwaggerUploadRequest(BaseModel):
    file: UploadFile
    
    @validator('file')
    def validate_file_type(cls, v):
        if not v.filename.endswith(('.json', '.yaml', '.yml')):
            raise ValueError('File must be JSON or YAML')
        return v
```

### 4. Logging

**Logging Rules**:
- Use structured logging (python-json-logger if needed)
- Log all important operations
- Include correlation IDs for request tracking
- Log performance metrics
- Use appropriate log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Never log sensitive information (passwords, tokens, etc.)

**Logging Example**:
```python
import logging

logger = logging.getLogger(__name__)

async def parse_swagger(file_path: str) -> Dict:
    logger.info("Starting Swagger parsing", extra={
        "file_path": file_path,
        "correlation_id": request_id
    })
    try:
        # Parsing logic
        logger.info("Swagger parsing completed", extra={
            "file_path": file_path,
            "duration_ms": duration
        })
    except Exception as e:
        logger.error("Swagger parsing failed", extra={
            "file_path": file_path,
            "error": str(e)
        }, exc_info=True)
        raise
```

### 5. Configuration

**Configuration Rules**:
- Use Pydantic Settings for configuration management
- Support environment-specific configurations
- Use environment variables for sensitive data
- Validate configuration on startup
- Provide default values where appropriate

### 6. Offline-First Development

**Offline Development Rules**:
- All functionality MUST work without internet connection
- No external API calls or cloud services
- All file operations use local file system
- Backend serves on localhost (127.0.0.1:8000)
- Frontend communicates only with local backend
- Error handling for offline scenarios
- No external dependencies for core functionality

## Performance Standards

### Async Operations
- **MUST** use async/await for all I/O operations
- **MUST** avoid blocking calls
- **MUST** use `asyncio.gather()` for parallel operations
- **MUST** use proper context managers for resource management

### Memory Management
- **MUST** use streaming for large file processing
- **MUST** implement proper context managers (with statements)
- **MUST** avoid memory leaks
- **MUST** use generators for large data processing

### Code Performance
- **MUST** optimize algorithms for performance
- **MUST** use caching where appropriate
- **MUST** avoid unnecessary computations
- **MUST** profile code to identify bottlenecks

## Security Standards

### Input Validation
- **MUST** validate all file uploads
- **MUST** sanitize file names
- **MUST** validate file sizes
- **MUST** check file types
- **MUST** scan for malicious content (optional but recommended)

### File Security
- **MUST** limit file sizes
- **MUST** restrict file types
- **MUST** secure file storage
- **MUST** validate file content before processing

### API Security
- **MUST** implement authentication/authorization (if required)
- **MUST** use HTTPS only
- **MUST** implement rate limiting
- **MUST** validate all inputs
- **MUST** sanitize user inputs

## Documentation Standards

### Code Documentation
- **MUST** include docstrings for all public functions, classes, and modules
- **MUST** use Google or NumPy style docstrings
- **MUST** document parameters, return types, and exceptions
- **MUST** include usage examples for complex functions

### API Documentation
- **MUST** use FastAPI's automatic OpenAPI documentation
- **MUST** document all endpoints with descriptions
- **MUST** include request/response examples
- **MUST** document error responses

### Project Documentation
- **MUST** maintain README.md files
- **MUST** document setup and installation procedures
- **MUST** document API usage
- **MUST** document deployment procedures

## Version Control Standards

### Git Standards
- **MUST** use meaningful commit messages
- **MUST** create feature branches for new features
- **MUST** use pull requests for code review
- **MUST** keep commits atomic and focused

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore

## Code Review Standards

### Review Checklist
- Code follows PEP 8 standards
- Code has proper documentation
- Code has appropriate tests
- Code handles errors properly
- Code follows design patterns
- Code is performant
- Code is secure
- Code is maintainable

## Dependency Management

### Dependency Rules
- **MUST** use requirements.txt for Python dependencies (Backend/requirements.txt)
- **MUST** use package.json for Node.js dependencies (Frontend/package.json)
- **MUST** pin dependency versions
- **MUST** use Python 3.12+ (latest stable version)
- **MUST** use Node.js 16+ for frontend
- **MUST** minimize external dependencies
- **MUST** ensure all dependencies work offline

### Dependency File Structure
- `Backend/requirements.txt`: Python production dependencies (Python 3.12+)
- `Frontend/package.json`: Node.js dependencies (React, Bootstrap, etc.)

### Frontend Dependencies
- React 18.3+ for UI framework
- Bootstrap 5.3+ for styling and components
- React Bootstrap 2.10+ for React-Bootstrap integration
- Bootstrap Icons 1.11+ for iconography
- React Router DOM 6.26+ for navigation
- Axios 1.7+ for HTTP client
