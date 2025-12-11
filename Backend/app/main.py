"""
FastAPI application entry point.
Main application setup with CORS, routes, and middleware.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from app.config import settings
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


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "detail": str(exc)}
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
