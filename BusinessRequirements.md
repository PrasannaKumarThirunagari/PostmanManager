# Business Requirements
## Swagger to Postman Collection Converter

## Overview
Convert Swagger/OpenAPI specifications to Postman collections and generate environment files programmatically.

## Core Functionality Requirements

### Primary Features
- Convert Swagger JSON/YAML files to Postman Collection format (latest version support)
- Generate Postman environment files for different environments (development, staging, production)
- Save all outputs to organized file/folder structure
- Automatically generate security test variants with injection payloads for all string inputs
- Replace hardcoded values with dynamic variables using `{{variablename}}` syntax
- Extract and collect all dynamic values to environment variable files
- Save each converted collection to `PostmanCollection/APINAME/` folder where APINAME is extracted from Swagger `info.title`
- Generate environment files in `Environments/APINAME/` folder with API name prefix

### File Structure Requirements

```
/
├── SwaggerFiles/                    # Input Swagger/OpenAPI specification files
├── PostmanCollection/               # Generated Postman collections
│   └── APINAME/                     # Folder named after API (extracted from Swagger info.title)
│       └── APINAME.postman_collection.json
└── Environments/                    # Generated environment files
    └── APINAME/                     # Folder named after API
        ├── APINAME-Development.postman_environment.json
        ├── APINAME-Staging.postman_environment.json
        └── APINAME-Production.postman_environment.json
```

### File Naming Rules
- **API Name Extraction**: Extract API name from Swagger `info.title` field
- **Collection Folder**: Create folder `PostmanCollection/APINAME/` for each API
- **Collection File**: Save as `APINAME.postman_collection.json` inside the API folder
- **Environment Folder**: Create folder `Environments/APINAME/` for each API
- **Environment Files**: Save as `APINAME-{Environment}.postman_environment.json` (e.g., `APINAME-Development.postman_environment.json`)
- **Sanitize Names**: Remove special characters, spaces, and invalid file system characters from API names

## Postman Collection Folder Structure

The generated Postman collection should follow this hierarchical structure:

```
APINAME/
├── RequestName1/
│   ├── Original Request
│   ├── XSS-Injections/
│   │   ├── Request with XSS payload variant 1
│   │   ├── Request with XSS payload variant 2
│   │   └── ...
│   ├── HTML-Injections/
│   │   ├── Request with HTML payload variant 1
│   │   └── ...
│   └── SQL-Injections/
│       ├── Request with SQL payload variant 1
│       └── ...
├── RequestName2/
│   └── ...
└── ...
```

### Security Testing Generation Rules
- For each request in the collection:
  1. Identify all string fields in the request body (JSON strings, query parameters, path parameters)
  2. For each string field, create cloned requests with injection payloads
  3. Organize cloned requests into folders by injection type:
     - **XSS-Injections**: Cross-Site Scripting payloads (e.g., `<script>alert('XSS')</script>`, `<img src=x onerror=alert(1)>`)
     - **HTML-Injections**: HTML injection payloads (e.g., `<h1>Test</h1>`, `<iframe src="...">`)
     - **SQL-Injections**: SQL injection payloads (e.g., `' OR '1'='1`, `'; DROP TABLE users--`)
  4. Preserve the original request structure and only modify the identified string fields
  5. Maintain request metadata (headers, authentication, etc.) in all variants
  6. Generate multiple payload variants per injection type for comprehensive testing

## Dynamic Variables and Environment Management

### Variable Replacement Strategy
Replace hardcoded values throughout the collection with Postman dynamic variables using the `{{variablename}}` syntax. This makes collections reusable across different environments and configurations.

### Values to Replace with Variables

1. **Base URLs and Endpoints**
   - Server URLs from Swagger `servers` array
   - Base paths and API versions
   - Example: `https://api.example.com/v1` → `{{baseUrl}}`

2. **Authentication Values**
   - API keys, tokens, Bearer tokens
   - OAuth credentials
   - Example: `Bearer abc123xyz` → `{{authToken}}`

3. **Request Body Values**
   - IDs, UUIDs, and identifiers
   - Email addresses, usernames
   - Dates and timestamps
   - Example: `"userId": "12345"` → `"userId": "{{userId}}"`

4. **Query Parameters**
   - Filter values, pagination parameters
   - Search terms, sort values
   - Example: `?page=1&limit=10` → `?page={{page}}&limit={{limit}}`

5. **Path Parameters**
   - Resource IDs in URL paths
   - Example: `/users/12345` → `/users/{{userId}}`

6. **Header Values**
   - Content-Type (if variable)
   - Custom headers with dynamic values
   - Example: `X-Request-ID: abc-123` → `X-Request-ID: {{requestId}}`

### Variable Naming Convention
- Use descriptive, camelCase names
- Prefix with context when needed (e.g., `userId`, `apiKey`, `baseUrl`)
- Use consistent naming across the collection
- Examples: `{{baseUrl}}`, `{{authToken}}`, `{{userId}}`, `{{email}}`, `{{pageSize}}`

### Environment Variable Collection Process

1. **Scan Requests**: Analyze all requests in the collection to identify hardcoded values
2. **Extract Variables**: Collect all unique variable names used in `{{variablename}}` format
3. **Categorize Variables**: Group variables by type (URLs, auth, data, etc.)
4. **Generate Environment Files**: Create environment files with:
   - Variable names as keys
   - Original values as initial/default values
   - Environment-specific values for dev/staging/production

### Environment File Structure

Each environment file should contain:

```json
{
  "name": "Development Environment",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://dev-api.example.com",
      "type": "default",
      "enabled": true
    },
    {
      "key": "authToken",
      "value": "dev-token-12345",
      "type": "secret",
      "enabled": true
    },
    {
      "key": "userId",
      "value": "test-user-001",
      "type": "default",
      "enabled": true
    }
  ]
}
```

### Implementation Rules
- Replace values in: URLs, headers, query parameters, path parameters, request bodies
- Maintain original values in environment files as defaults
- Generate separate environment files for each environment (dev, staging, prod)
- Ensure all variables are properly scoped (collection or environment level)
- Preserve variable references in security test variants (use variables, not hardcoded values)

## Version Support Requirements

### Swagger/OpenAPI Version Support

**MUST support the following Swagger/OpenAPI versions**:

1. **OpenAPI 3.1.x** (Latest)
   - Full support for all features
   - Support for webhooks
   - Support for all schema types
   - Support for all authentication types

2. **OpenAPI 3.0.x** (Previous)
   - Full backward compatibility
   - Handle differences from 3.1.x
   - Support all 3.0.x features

3. **Swagger 2.0** (Legacy)
   - Convert Swagger 2.0 to OpenAPI 3.0 format internally
   - Support all Swagger 2.0 features
   - Handle deprecated fields appropriately

**Version Detection and Handling**:
- Auto-detect Swagger/OpenAPI version from file
- Use appropriate parser based on version
- Convert between versions when necessary
- Provide clear error messages for unsupported versions

### Postman Collection Version Support

**MUST support the following Postman Collection formats**:

1. **Postman Collection v2.1** (Latest)
   - Full support for all v2.1 features
   - Support for all request types
   - Support for all authentication types
   - Support for pre-request scripts and tests
   - Support for variables and environments

2. **Postman Collection v2.0** (Previous)
   - Generate v2.0 format when needed
   - Handle differences between v2.0 and v2.1
   - Maintain backward compatibility

**Collection Format Requirements**:
- Generate valid Postman Collection JSON
- Include all required fields
- Support optional fields
- Validate collection structure before saving
- Support collection metadata

**Environment File Support**:
- Generate Postman Environment v1.0 format
- Support all environment variable types
- Include variable metadata
- Support variable scoping

## API Endpoints Requirements

**Required API Endpoints**:

```
POST   /api/swagger/upload              - Upload Swagger file
POST   /api/swagger/convert              - Convert Swagger to Postman
GET    /api/swagger/files                - List all Swagger files
GET    /api/swagger/files/{id}           - Get Swagger file details
PUT    /api/swagger/files/{id}           - Update Swagger file
DELETE /api/swagger/files/{id}           - Delete Swagger file
POST   /api/swagger/files/{id}/clone     - Clone Swagger file

GET    /api/collections                  - List all collections
GET    /api/collections/{id}             - Get collection details
POST   /api/collections                  - Create new collection
PUT    /api/collections/{id}             - Update collection
DELETE /api/collections/{id}             - Delete collection
POST   /api/collections/{id}/clone       - Clone collection
POST   /api/collections/{id}/requests/{requestId}/clone - Clone request

GET    /api/collections/{id}/download    - Download collection
GET    /api/environments/{id}/download   - Download environment file

GET    /api/conversions                  - List conversion history
GET    /api/conversions/{id}              - Get conversion status
POST   /api/conversions/{id}/cancel      - Cancel conversion
```

## Additional Business Rules

### API Name Extraction
- Extract API name from Swagger `info.title` field
- Fallback to `info.name` or filename if `title` is not available
- Sanitize API name for file system compatibility (remove special characters, replace spaces with hyphens)
- Use sanitized name for folder and file naming

### Collection Metadata
- Set collection name from Swagger `info.title`
- Include Swagger `info.description` as collection description
- Include Swagger `info.version` in collection metadata
- Preserve Swagger `info.contact` and `info.license` information if available

### Request Handling
- Support all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Handle request bodies for POST, PUT, PATCH requests
- Map Swagger `requestBody` to Postman request body
- Support multiple content types (application/json, application/xml, multipart/form-data, etc.)
- Handle nested objects and arrays in request bodies
- Preserve Swagger examples in request body examples
- Map Swagger `parameters` (query, path, header, cookie) to Postman request parameters

### Response Handling
- Include Swagger response schemas in request documentation
- Map Swagger response examples to Postman response examples
- Document response status codes from Swagger `responses` object
- Include response headers from Swagger definitions

### Schema and Reference Handling
- Resolve Swagger `$ref` references to components/schemas
- Handle nested schema references
- Map Swagger data types to appropriate Postman types
- Handle Swagger `enum` values in parameters and request bodies
- Support Swagger `required` fields and mark them appropriately
- Handle Swagger `default` values and include in environment variables

### Authentication Mapping
- Map Swagger `securitySchemes` to Postman authentication
- Support: API Key, HTTP (Basic, Bearer), OAuth 2.0, OpenID Connect
- Configure authentication at collection level when defined globally
- Configure authentication at request level when defined per-operation

### Multiple Swagger Files
- Process multiple Swagger files in batch
- Create separate collection and environment folders for each API
- Handle cases where multiple Swagger files reference the same API name (append suffix or use filename)

### Security Test Variants
- Generate security test variants only for string-type fields
- Skip security variants for numeric, boolean, and other non-string types
- Maintain original request as the first item in each request folder
- Use descriptive names for security test variant requests (e.g., "XSS-Payload-1", "SQL-Injection-Basic")

### Variable Extraction Intelligence
- Identify which values should be variables vs. which should remain static
- Don't replace example values that are clearly placeholders
- Extract meaningful variable names from context (e.g., `userId` from field name `user_id` or `userId`)
- Group related variables logically in environment files

## Frontend Requirements

### UI Framework and Design
- **Framework**: React (Latest stable version)
- **UI Library**: Bootstrap 5.3+ with React Bootstrap components
- **Icons**: Bootstrap Icons for professional iconography
- **Navigation**: Left sidebar navigation bar with collapsible menu
- **Responsive Design**: Mobile-first, fully responsive layout
- **Offline-First**: All functionality works completely offline (no external API dependencies)

### Navigation Structure
The frontend MUST include a left navigation sidebar with the following sections:
- **Dashboard**: Overview and statistics
- **Swagger Files**: Upload, manage, and view Swagger files
- **Collections**: View and manage generated Postman collections
- **Environments**: Manage environment files
- **Conversions**: View conversion history and status
- **Settings**: Application settings and configuration

### Frontend-Backend Synchronization
- Frontend MUST communicate with backend API at `http://127.0.0.1:8000`
- All API calls MUST use relative paths or configured base URL
- Frontend MUST handle offline scenarios gracefully
- Error handling MUST be consistent between frontend and backend
- API response formats MUST match frontend expectations

### Offline Functionality
- Application MUST work completely offline (no internet connection required)
- All processing happens locally on the user's machine
- No external API calls or cloud services
- File operations are local file system only
- All data stays on the local machine

## Output Deliverables
- Postman Collection JSON file (v2.1 format, latest)
- Environment files for Development, Staging, and Production
- Organized folder structure with API name-based directories
- Security test variants for comprehensive API testing
- Reusable, optimized, and well-tested backend code
- Modern, responsive React frontend with Bootstrap UI and left navigation sidebar
