"""
Swagger file management endpoints.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import os
import json
import yaml
import aiofiles
from pathlib import Path
from app.config import settings

router = APIRouter()


@router.get("/files")
async def list_swagger_files():
    """List all Swagger files."""
    swagger_dir = Path(settings.swagger_files_dir)
    if not swagger_dir.exists():
        return {"files": []}
    
    files = []
    for file_path in swagger_dir.glob("*.json"):
        files.append({
            "id": file_path.stem,
            "name": file_path.name,
            "size": file_path.stat().st_size,
            "modified": file_path.stat().st_mtime
        })
    for file_path in swagger_dir.glob("*.yaml"):
        files.append({
            "id": file_path.stem,
            "name": file_path.name,
            "size": file_path.stat().st_size,
            "modified": file_path.stat().st_mtime
        })
    for file_path in swagger_dir.glob("*.yml"):
        files.append({
            "id": file_path.stem,
            "name": file_path.name,
            "size": file_path.stat().st_size,
            "modified": file_path.stat().st_mtime
        })
    
    return {"files": files}


@router.get("/files/{file_id}")
async def get_swagger_file(file_id: str):
    """Get Swagger file details."""
    swagger_dir = Path(settings.swagger_files_dir)
    
    # Try to find the file
    for ext in [".json", ".yaml", ".yml"]:
        file_path = swagger_dir / f"{file_id}{ext}"
        if file_path.exists():
            return {
                "id": file_id,
                "name": file_path.name,
                "size": file_path.stat().st_size,
                "modified": file_path.stat().st_mtime,
                "path": str(file_path)
            }
    
    raise HTTPException(status_code=404, detail="File not found")


@router.get("/files/{file_id}/authorization-types")
async def get_authorization_types(file_id: str):
    """Extract authorization types from Swagger file."""
    swagger_dir = Path(settings.swagger_files_dir)
    file_path = None
    
    # Find the file
    for ext in [".json", ".yaml", ".yml"]:
        potential_path = swagger_dir / f"{file_id}{ext}"
        if potential_path.exists():
            file_path = potential_path
            break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Read and parse the file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            if file_path.suffix == '.json':
                swagger_data = json.load(f)
            else:
                swagger_data = yaml.safe_load(f)
    except (json.JSONDecodeError, yaml.YAMLError) as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to parse Swagger file {file_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    except (IOError, OSError) as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to read Swagger file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error processing Swagger file {file_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    # Extract authorization types from securitySchemes
    authorization_types = []
    
    # OpenAPI 3.x format
    if 'components' in swagger_data and 'securitySchemes' in swagger_data['components']:
        for scheme_name, scheme_data in swagger_data['components']['securitySchemes'].items():
            scheme_type = scheme_data.get('type', '').lower()
            if scheme_type == 'http':
                # Check for bearer or basic
                scheme_scheme = scheme_data.get('scheme', '').lower()
                if scheme_scheme == 'bearer':
                    authorization_types.append({
                        "name": scheme_name,
                        "type": "bearer",
                        "display": f"{scheme_name} (Bearer Token)"
                    })
                elif scheme_scheme == 'basic':
                    authorization_types.append({
                        "name": scheme_name,
                        "type": "basic",
                        "display": f"{scheme_name} (Basic Auth)"
                    })
            elif scheme_type == 'apikey':
                authorization_types.append({
                    "name": scheme_name,
                    "type": "apiKey",
                    "display": f"{scheme_name} (API Key)"
                })
            elif scheme_type == 'oauth2':
                authorization_types.append({
                    "name": scheme_name,
                    "type": "oauth2",
                    "display": f"{scheme_name} (OAuth 2.0)"
                })
            elif scheme_type == 'openidconnect':
                authorization_types.append({
                    "name": scheme_name,
                    "type": "openIdConnect",
                    "display": f"{scheme_name} (OpenID Connect)"
                })
    
    # Swagger 2.0 format
    elif 'securityDefinitions' in swagger_data:
        for scheme_name, scheme_data in swagger_data['securityDefinitions'].items():
            scheme_type = scheme_data.get('type', '').lower()
            if scheme_type == 'basic':
                authorization_types.append({
                    "name": scheme_name,
                    "type": "basic",
                    "display": f"{scheme_name} (Basic Auth)"
                })
            elif scheme_type == 'apikey':
                authorization_types.append({
                    "name": scheme_name,
                    "type": "apiKey",
                    "display": f"{scheme_name} (API Key)"
                })
            elif scheme_type == 'oauth2':
                authorization_types.append({
                    "name": scheme_name,
                    "type": "oauth2",
                    "display": f"{scheme_name} (OAuth 2.0)"
                })
    
    # If no authorization types found, return empty list
    return {"authorization_types": authorization_types}


@router.post("/upload")
async def upload_swagger_file(file: UploadFile = File(...)):
    """Upload a Swagger file."""
    import logging
    import re
    logger = logging.getLogger(__name__)
    
    # Validate file name
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    # Sanitize filename to prevent path traversal
    filename = file.filename
    # Remove any path components
    filename = Path(filename).name
    # Remove any dangerous characters
    filename = re.sub(r'[<>:"|?*\x00-\x1f]', '', filename)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Validate file type
    file_ext = Path(filename).suffix.lower()
    if file_ext not in settings.allowed_file_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.allowed_file_types)}"
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size} bytes"
        )
    
    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    try:
        # Save file
        swagger_dir = Path(settings.swagger_files_dir)
        swagger_dir.mkdir(exist_ok=True)
        
        # Ensure file path is within swagger_dir (prevent path traversal)
        file_path = (swagger_dir / filename).resolve()
        if not str(file_path).startswith(str(swagger_dir.resolve())):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        logger.info(f"Swagger file uploaded: {filename} ({len(content)} bytes)")
        
        return {
            "id": file_path.stem,
            "name": filename,
            "size": len(content),
            "message": "File uploaded successfully"
        }
    except (IOError, OSError) as e:
        logger.error(f"Failed to save Swagger file {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


@router.put("/files/{file_id}")
async def update_swagger_file(file_id: str, file: UploadFile = File(...)):
    """Update a Swagger file."""
    import logging
    import re
    logger = logging.getLogger(__name__)
    
    # Sanitize file_id to prevent path traversal
    file_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', file_id)
    if not file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    swagger_dir = Path(settings.swagger_files_dir)
    
    # Find existing file
    existing_file_path = None
    for ext in [".json", ".yaml", ".yml"]:
        potential_path = swagger_dir / f"{file_id}{ext}"
        # Ensure path is within swagger_dir (prevent path traversal)
        potential_path = potential_path.resolve()
        if not str(potential_path).startswith(str(swagger_dir.resolve())):
            continue
        if potential_path.exists():
            existing_file_path = potential_path
            break
    
    if not existing_file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Validate and sanitize filename
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    filename = Path(file.filename).name
    filename = re.sub(r'[<>:"|?*\x00-\x1f]', '', filename)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Validate file type
    file_ext = Path(filename).suffix.lower()
    if file_ext not in settings.allowed_file_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.allowed_file_types)}"
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size} bytes"
        )
    
    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    try:
        # Save file (overwrite existing)
        async with aiofiles.open(existing_file_path, 'wb') as f:
            await f.write(content)
        
        logger.info(f"Swagger file updated: {file_id} ({len(content)} bytes)")
        
        return {
            "id": file_id,
            "name": existing_file_path.name,
            "size": len(content),
            "message": "File updated successfully"
        }
    except (IOError, OSError) as e:
        logger.error(f"Failed to update Swagger file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update file: {str(e)}")


@router.post("/files/{file_id}/clone")
async def clone_swagger_file(file_id: str):
    """Clone a Swagger file."""
    import logging
    import re
    import time
    import shutil
    logger = logging.getLogger(__name__)
    
    # Sanitize file_id to prevent path traversal
    file_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', file_id)
    if not file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    swagger_dir = Path(settings.swagger_files_dir)
    
    # Find source file
    source_file_path = None
    for ext in [".json", ".yaml", ".yml"]:
        potential_path = swagger_dir / f"{file_id}{ext}"
        # Ensure path is within swagger_dir (prevent path traversal)
        potential_path = potential_path.resolve()
        if not str(potential_path).startswith(str(swagger_dir.resolve())):
            continue
        if potential_path.exists():
            source_file_path = potential_path
            break
    
    if not source_file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Generate new filename
        timestamp = int(time.time())
        new_file_id = f"{file_id}_clone_{timestamp}"
        new_file_path = swagger_dir / f"{new_file_id}{source_file_path.suffix}"
        
        # Ensure new path is within swagger_dir
        new_file_path = new_file_path.resolve()
        if not str(new_file_path).startswith(str(swagger_dir.resolve())):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Copy file
        shutil.copy2(source_file_path, new_file_path)
        
        logger.info(f"Swagger file cloned: {file_id} -> {new_file_id}")
        
        return {
            "id": new_file_id,
            "name": new_file_path.name,
            "size": new_file_path.stat().st_size,
            "message": "File cloned successfully"
        }
    except (IOError, OSError, shutil.Error) as e:
        logger.error(f"Failed to clone Swagger file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clone file: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_swagger_file(file_id: str):
    """Delete a Swagger file."""
    import logging
    import re
    logger = logging.getLogger(__name__)
    
    # Sanitize file_id to prevent path traversal
    file_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', file_id)
    if not file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    swagger_dir = Path(settings.swagger_files_dir)
    
    # Try to find and delete the file
    deleted = False
    for ext in [".json", ".yaml", ".yml"]:
        file_path = swagger_dir / f"{file_id}{ext}"
        # Ensure path is within swagger_dir (prevent path traversal)
        file_path = file_path.resolve()
        if not str(file_path).startswith(str(swagger_dir.resolve())):
            continue
        if file_path.exists():
            try:
                file_path.unlink()
                deleted = True
                logger.info(f"Swagger file deleted: {file_id}")
                break
            except (IOError, OSError) as e:
                logger.error(f"Failed to delete Swagger file {file_id}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"message": "File deleted successfully"}
