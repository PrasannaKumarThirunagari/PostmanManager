# Project: Swagger to Postman Collection Converter

## Overview
Convert Swagger/OpenAPI specifications to Postman collections and generate environment files programmatically.

This project provides a comprehensive solution for converting Swagger/OpenAPI specification files into Postman collections with automatic security test variant generation, dynamic variable extraction, and multi-environment support.

## Documentation Structure

This project documentation is organized into separate files for better maintainability and clarity:

### 📋 [Business Requirements](./BusinessRequirements.md)
Contains all business logic, functional requirements, and business rules:
- Core functionality requirements
- File structure and naming conventions
- Postman collection structure requirements
- Security testing generation rules
- Dynamic variables and environment management
- Version support requirements
- API endpoints requirements
- Additional business rules and implementation considerations

### 🏗️ [Technical Architecture](./TechnicalArchitecture.md)
Contains technical implementation details and architecture:
- Technology stack (Backend: Python FastAPI, Frontend: React)
- Backend architecture and design patterns
- Project structure and organization
- Performance optimization strategies
- CORS configuration
- Error handling architecture
- Configuration management
- Logging architecture
- API documentation strategy
- Testing architecture
- Deployment architecture
- Security architecture

### 📐 [Rules and Standards](./RulesAndStandards.md)
Contains coding standards, best practices, and development rules:
- Code quality requirements (PEP 8, type hints, documentation)
- Design patterns (Factory, Strategy, Builder, Adapter, etc.)
- SOLID principles implementation
- Best practices for code organization
- Error handling standards
- Validation rules
- Logging standards
- Configuration standards
- Testing standards
- Performance standards
- Security standards
- Documentation standards
- Version control standards
- Code review standards
- Dependency management rules

## Quick Start

### Prerequisites
- Python 3.12+ (latest stable version for backend)
- Node.js 16+ and npm (for frontend)
- Git (optional, for version control)
- Windows OS (for .bat file execution)

### Installation

1. **Backend Setup**:
   ```bash
   cd Backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Frontend Setup**:
   ```bash
   cd Frontend
   npm install
   ```

3. **Environment Configuration**:
   - Copy `.env.example` to `.env` in both Backend and Frontend directories
   - Configure environment variables as needed

### Running the Application

**Option 1: Using Batch File (Recommended for Windows)**:
```bash
# Double-click start-apps.bat or run from command prompt
start-apps.bat
```
This will automatically:
- Check Python and Node.js installation
- Install dependencies if needed
- Start backend server on http://127.0.0.1:8000
- Start frontend application on http://localhost:3000

**Option 2: Manual Start**:

1. **Start Backend**:
   ```bash
   cd Backend
   venv\Scripts\activate
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Start Frontend** (in a new terminal):
   ```bash
   cd Frontend
   npm start
   ```

**Note**: The application works completely offline - no internet connection required!

## Technology Stack Summary

- **Backend**: Python 3.12+ with FastAPI (Latest stable version)
- **Frontend**: React 18.3+ with Bootstrap 5.3+ (Latest stable versions)
- **Backend Dependencies**: See [Backend/requirements.txt](./Backend/requirements.txt)
- **Frontend Dependencies**: See [Frontend/package.json](./Frontend/package.json)
- **Offline-First**: All functionality works without internet connection

## Key Features

1. **Swagger/OpenAPI Conversion**
   - Support for OpenAPI 3.1.x, 3.0.x, and Swagger 2.0
   - Automatic version detection
   - JSON and YAML format support

2. **Postman Collection Generation**
   - Postman Collection v2.1 format (with v2.0 backward compatibility)
   - Organized folder structure by API name
   - Preserves API documentation and metadata

3. **Security Testing**
   - Automatic generation of security test variants
   - XSS, HTML, and SQL injection payloads
   - Organized by injection type in separate folders

4. **Dynamic Variables**
   - Automatic extraction of hardcoded values
   - Replacement with Postman variable syntax `{{variablename}}`
   - Environment-specific variable files

5. **Multi-Environment Support**
   - Development, Staging, and Production environments
   - Separate environment files for each API
   - Environment-specific variable values

6. **Offline-First Architecture**
   - Works completely offline (no internet required)
   - All processing happens locally
   - Local file system storage only
   - No external API dependencies

7. **Professional UI**
   - Bootstrap 5.3+ for modern, responsive design
   - Left sidebar navigation with collapsible menu
   - Bootstrap Icons for professional iconography
   - Mobile-first responsive layout

## Project Structure

```
Project Root/
├── Backend/                    # Python FastAPI Backend (Python 3.12+)
│   ├── app/                    # Main application
│   ├── venv/                   # Python virtual environment (created on setup)
│   ├── requirements.txt        # Python dependencies
│   └── README.md              # Backend documentation
│
├── Frontend/                   # React Frontend
│   ├── src/                   # Source code
│   │   ├── components/        # React components
│   │   │   ├── Layout/        # Layout components (Sidebar, Header)
│   │   │   └── ...            # Feature components
│   │   └── pages/             # Page components
│   ├── public/                # Public assets
│   ├── package.json           # Frontend dependencies
│   └── README.md             # Frontend documentation
│
├── SwaggerFiles/               # Input Swagger/OpenAPI files
├── PostmanCollection/         # Generated Postman collections
├── Environments/               # Generated environment files
│
├── ProjectDetails.md          # This file (main overview)
├── BusinessRequirements.md   # Business requirements
├── TechnicalArchitecture.md   # Technical architecture
├── RulesAndStandards.md      # Coding standards and rules
└── start-apps.bat            # Batch file to start both apps
```

## API Endpoints

The application provides RESTful API endpoints for:
- Swagger file upload and management
- Collection generation and management
- Conversion tracking and status
- File download

For detailed endpoint documentation, see [Business Requirements - API Endpoints](./BusinessRequirements.md#api-endpoints-requirements).

## Version Support

### Swagger/OpenAPI Versions
- ✅ OpenAPI 3.1.x (Latest)
- ✅ OpenAPI 3.0.x
- ✅ Swagger 2.0 (Legacy)

### Postman Collection Versions
- ✅ Postman Collection v2.1 (Latest)
- ✅ Postman Collection v2.0 (Backward compatibility)

## Development Guidelines

### Code Quality
- Follow PEP 8 standards (Python)
- Use type hints throughout
- Comprehensive docstrings (Google style)
- Unit and integration tests
- Code coverage target: 80%+

### Architecture
- Clean Architecture principles
- SOLID principles
- Dependency Injection
- Design Patterns (Factory, Strategy, Builder, etc.)

For detailed guidelines, see [Rules and Standards](./RulesAndStandards.md).

## Dependencies

### Backend Dependencies
See [Backend/requirements.txt](./Backend/requirements.txt) for complete list. Key dependencies:
- Python 3.12+ (latest stable version)
- FastAPI 0.115+ (web framework)
- Pydantic 2.9+ (data validation)
- Uvicorn 0.32+ (ASGI server)
- PyYAML 6.0+ (YAML parsing)
- aiofiles 24.1+ (async file operations)

### Frontend Dependencies
See [Frontend/package.json](./Frontend/package.json) for complete list. Key dependencies:
- React 18.3+ (UI framework)
- Bootstrap 5.3+ (CSS framework)
- React Bootstrap 2.10+ (Bootstrap components for React)
- Bootstrap Icons 1.11+ (icon library)
- React Router DOM 6.26+ (routing)
- Axios 1.7+ (HTTP client)

## Security Considerations

- Input validation on all API endpoints
- File upload security (size limits, type validation)
- CORS configuration for local development (localhost only)
- Local file system security
- No external network access required (offline-first)

For detailed security requirements, see:
- [Technical Architecture - Security Architecture](./TechnicalArchitecture.md#security-architecture)
- [Rules and Standards - Security Standards](./RulesAndStandards.md#security-standards)

## Offline-First Development

- All functionality works without internet connection
- Backend runs locally on http://127.0.0.1:8000
- Frontend runs locally on http://localhost:3000
- All file operations use local file system
- No external API calls or cloud services
- Complete offline operation

For offline-first architecture details, see [Technical Architecture - Offline-First Architecture](./TechnicalArchitecture.md#offline-first-architecture).

## Contributing

1. Follow the coding standards outlined in [Rules and Standards](./RulesAndStandards.md)
2. Write tests for new features
3. Update documentation as needed
4. Follow Git commit message conventions
5. Submit pull requests for review

## Additional Resources

- **Business Logic**: See [Business Requirements](./BusinessRequirements.md)
- **Technical Details**: See [Technical Architecture](./TechnicalArchitecture.md)
- **Development Standards**: See [Rules and Standards](./RulesAndStandards.md)
- **Backend Setup**: See `Backend/README.md`
- **Frontend Setup**: See `Frontend/README.md`

## Summary of Key Requirements

### Critical Implementation Points

1. **Technology Stack**:
   - **Backend**: Python 3.12+ with FastAPI (latest stable version)
   - **Frontend**: React 18.3+ with Bootstrap 5.3+ (latest stable versions)
   - **UI**: Bootstrap with left sidebar navigation
   - **Offline-First**: All functionality works without internet connection
   - All backend code MUST be reusable, optimized, and follow best practices

2. **Version Support**:
   - **Swagger/OpenAPI**: Support OpenAPI 3.1.x (latest), 3.0.x, and Swagger 2.0
   - **Postman Collection**: Support v2.1 (latest) with v2.0 backward compatibility
   - Auto-detect versions and use appropriate parsers

3. **File Organization**: 
   - Each API gets its own folder structure:
     - `PostmanCollection/APINAME/APINAME.postman_collection.json`
     - `Environments/APINAME/APINAME-{Environment}.postman_environment.json`

4. **Collection Structure**: 
   - API name as root folder
   - Each request in its own folder
   - Security test variants organized by injection type

5. **Variable Management**:
   - Replace hardcoded values with `{{variablename}}` syntax
   - Extract all variables to environment files
   - Maintain original values as defaults

6. **Security Testing**:
   - Generate XSS, HTML, and SQL injection variants
   - Only for string-type fields
   - Preserve original request structure

7. **Code Quality**:
   - Follow SOLID principles and Clean Architecture
   - Use Dependency Injection throughout
   - Implement async/await for all I/O operations
   - Use Python standard library where possible, minimal external dependencies
   - Python 3.12+ required (latest stable version)

8. **Frontend Requirements**:
   - React 18.3+ with Bootstrap 5.3+ UI
   - Left sidebar navigation with collapsible menu
   - Bootstrap Icons for professional iconography
   - Responsive, mobile-first design
   - Offline-first architecture

9. **Performance**:
   - Optimize memory usage and implement proper resource management
   - Use parallel processing where applicable
   - Implement caching strategies
   - Stream large files instead of loading into memory

10. **Offline Operation**:
    - All functionality works without internet connection
    - Local file system operations only
    - No external API dependencies
    - Backend and frontend run locally

### Output Deliverables
- Postman Collection JSON file (v2.1 format, latest)
- Environment files for Development, Staging, and Production
- Organized folder structure with API name-based directories
- Security test variants for comprehensive API testing
- Reusable, optimized, and well-tested backend code (Python 3.12+)
- Modern, responsive React frontend with Bootstrap UI and left navigation sidebar
- Offline-first application (no internet connection required)
- Batch file for easy startup (start-apps.bat)

---

**Note**: For detailed information on any specific aspect of the project, please refer to the corresponding documentation file:
- [Business Requirements](./BusinessRequirements.md) - For business logic and functional requirements
- [Technical Architecture](./TechnicalArchitecture.md) - For technical implementation details
- [Rules and Standards](./RulesAndStandards.md) - For coding standards and best practices
