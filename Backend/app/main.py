"""
FastAPI application entry point.
Main application setup with CORS, routes, and middleware.
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from typing import Dict, Any
from app.config import settings
from app.exceptions import (
    SwaggerParseError,
    PostmanCollectionError,
    ValidationError,
    FileOperationError,
    ConversionError
)
from app.api.v1 import swagger, collections, conversions, health, environments, filtering_conditions, global_headers, status_scripts, documentation, default_api_configs, injection_responses, login_collection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Convert Swagger/OpenAPI specifications to Postman collections",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(swagger.router, prefix="/api/swagger", tags=["Swagger"])
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])
app.include_router(conversions.router, prefix="/api/conversions", tags=["Conversions"])
app.include_router(environments.router, prefix="/api/environments", tags=["Environments"])
app.include_router(filtering_conditions.router, prefix="/api/filtering-conditions", tags=["Filtering Conditions"])
app.include_router(global_headers.router, prefix="/api/global-headers", tags=["Global Headers"])
app.include_router(status_scripts.router, prefix="/api/status-scripts", tags=["Status Scripts"])
app.include_router(documentation.router, prefix="/api/documentation", tags=["Documentation"])
app.include_router(default_api_configs.router, prefix="/api/default-api-configs", tags=["Default API Configs"])
app.include_router(injection_responses.router, tags=["Injection Responses"])
app.include_router(login_collection.router, prefix="/api/login-collection", tags=["Login Collection"])

# Serve static files from React build (ONLY when build directory exists)
# This won't affect the development setup - build directory only exists after npm run build
from pathlib import Path

# Check for build directory in multiple possible locations (development vs standalone)
possible_build_dirs = [
    Path(__file__).parent.parent.parent / "Frontend" / "build",  # Development root
    Path(__file__).parent.parent.parent.parent / "Frontend" / "build",  # Standalone distribution
    Path(__file__).parent.parent / "Frontend" / "build",  # Alternative structure
]

static_dir = None
for build_dir in possible_build_dirs:
    if build_dir.exists() and (build_dir / "index.html").exists():
        static_dir = build_dir
        break

if static_dir:
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    logger.info(f"Serving static files from: {static_dir}")
    
    # Mount static files
    static_files_dir = static_dir / "static"
    if static_files_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_files_dir)), name="static")
    
    # Serve index.html for all non-API routes (React Router)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React app for all non-API routes."""
        # Don't serve API routes or static files
        if full_path.startswith("api/") or full_path.startswith("static/") or full_path.startswith("docs"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        
        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse(status_code=404, content={"detail": "Frontend not built"})
else:
    logger.info("Frontend build not found - running in API-only mode (development)")


@app.exception_handler(SwaggerParseError)
async def swagger_parse_error_handler(request: Request, exc: SwaggerParseError) -> JSONResponse:
    """
    Handle Swagger parsing errors.
    
    Args:
        request: FastAPI request object
        exc: SwaggerParseError exception
        
    Returns:
        JSONResponse with error details
    """
    logger.error(f"Swagger parse error: {exc.message}", exc_info=True, extra={
        "file_path": exc.file_path,
        "detail": exc.detail
    })
    return JSONResponse(
        status_code=400,
        content={
            "message": exc.message,
            "error_code": "SWAGGER_PARSE_ERROR",
            "detail": exc.detail if settings.debug else None
        }
    )


@app.exception_handler(PostmanCollectionError)
async def postman_collection_error_handler(request: Request, exc: PostmanCollectionError) -> JSONResponse:
    """
    Handle Postman collection errors.
    
    Args:
        request: FastAPI request object
        exc: PostmanCollectionError exception
        
    Returns:
        JSONResponse with error details
    """
    logger.error(f"Postman collection error: {exc.message}", exc_info=True, extra={
        "collection_id": exc.collection_id,
        "detail": exc.detail
    })
    return JSONResponse(
        status_code=400,
        content={
            "message": exc.message,
            "error_code": "POSTMAN_COLLECTION_ERROR",
            "detail": exc.detail if settings.debug else None
        }
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """
    Handle validation errors.
    
    Args:
        request: FastAPI request object
        exc: ValidationError exception
        
    Returns:
        JSONResponse with error details
    """
    logger.warning(f"Validation error: {exc.message}", extra={
        "field": exc.field,
        "detail": exc.detail
    })
    return JSONResponse(
        status_code=422,
        content={
            "message": exc.message,
            "error_code": "VALIDATION_ERROR",
            "field": exc.field,
            "detail": exc.detail if settings.debug else None
        }
    )


@app.exception_handler(FileOperationError)
async def file_operation_error_handler(request: Request, exc: FileOperationError) -> JSONResponse:
    """
    Handle file operation errors.
    
    Args:
        request: FastAPI request object
        exc: FileOperationError exception
        
    Returns:
        JSONResponse with error details
    """
    logger.error(f"File operation error: {exc.message}", exc_info=True, extra={
        "file_path": exc.file_path,
        "detail": exc.detail
    })
    return JSONResponse(
        status_code=500,
        content={
            "message": exc.message,
            "error_code": "FILE_OPERATION_ERROR",
            "detail": exc.detail if settings.debug else None
        }
    )


@app.exception_handler(ConversionError)
async def conversion_error_handler(request: Request, exc: ConversionError) -> JSONResponse:
    """
    Handle conversion errors.
    
    Args:
        request: FastAPI request object
        exc: ConversionError exception
        
    Returns:
        JSONResponse with error details
    """
    logger.error(f"Conversion error: {exc.message}", exc_info=True, extra={
        "conversion_id": exc.conversion_id,
        "detail": exc.detail
    })
    return JSONResponse(
        status_code=500,
        content={
            "message": exc.message,
            "error_code": "CONVERSION_ERROR",
            "detail": exc.detail if settings.debug else None
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle HTTP exceptions from FastAPI.
    
    Args:
        request: FastAPI request object
        exc: HTTPException
        
    Returns:
        JSONResponse with error details
    """
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.detail,
            "error_code": f"HTTP_{exc.status_code}"
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for all unhandled exceptions.
    Sanitizes error messages to prevent information disclosure.
    
    Args:
        request: FastAPI request object
        exc: Exception that was raised
        
    Returns:
        JSONResponse with sanitized error message
    """
    # Log the full exception with stack trace
    logger.error(f"Unhandled exception: {type(exc).__name__}", exc_info=True, extra={
        "path": str(request.url),
        "method": request.method
    })
    
    # Return sanitized error message (don't expose internal details)
    error_message = "An internal server error occurred"
    if settings.debug:
        # Only show detailed error in debug mode
        error_message = f"Internal server error: {str(exc)}"
    
    return JSONResponse(
        status_code=500,
        content={
            "message": error_message,
            "error_code": "INTERNAL_SERVER_ERROR",
            "detail": str(exc) if settings.debug else None
        }
    )


@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Server running on http://{settings.host}:{settings.port}")
    
    # Create necessary directories
    import os
    os.makedirs(settings.swagger_files_dir, exist_ok=True)
    os.makedirs(settings.postman_collections_dir, exist_ok=True)
    os.makedirs(settings.environments_dir, exist_ok=True)
    logger.info("Application directories created")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info("Shutting down application")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
