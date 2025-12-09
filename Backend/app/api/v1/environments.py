"""
Environment file management endpoints.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import json
from app.config import settings

router = APIRouter()


@router.get("/{env_id}/download")
async def download_environment(env_id: str):
    """
    Download an environment file.
    
    Args:
        env_id: Environment identifier in format "api_name-env_name"
    
    Returns:
        FileResponse with the environment file
    """
    environments_dir = Path(settings.environments_dir)
    
    # Parse env_id (format: api_name-env_name)
    # Try to find the file by searching all API directories
    env_file_path = None
    
    for api_dir in environments_dir.iterdir():
        if api_dir.is_dir():
            # Try different naming patterns
            for pattern in [
                f"{env_id}.json",
                f"{env_id}.postman_environment.json",
                f"*-{env_id}.json",
                f"*-{env_id}.postman_environment.json"
            ]:
                potential_file = api_dir.glob(pattern)
                for file_path in potential_file:
                    if file_path.exists():
                        env_file_path = file_path
                        break
                if env_file_path:
                    break
            if env_file_path:
                break
    
    # If not found by pattern, try direct lookup
    if not env_file_path:
        # Try to find by splitting env_id
        parts = env_id.split('-', 1)
        if len(parts) == 2:
            api_name, env_name = parts
            api_dir = environments_dir / api_name
            if api_dir.exists():
                # Try different file naming patterns
                for pattern in [
                    f"{api_name}-{env_name}.postman_environment.json",
                    f"{api_name}-{env_name}.json",
                    f"{api_name}.{env_name}.json"
                ]:
                    potential_file = api_dir / pattern
                    if potential_file.exists():
                        env_file_path = potential_file
                        break
    
    if not env_file_path or not env_file_path.exists():
        raise HTTPException(status_code=404, detail="Environment file not found")
    
    return FileResponse(
        path=str(env_file_path),
        filename=env_file_path.name,
        media_type="application/json"
    )


@router.delete("/{env_id}")
async def delete_environment(env_id: str):
    """
    Delete an environment file.
    
    Args:
        env_id: Environment identifier in format "api_name-env_name"
    
    Returns:
        Success message
    """
    environments_dir = Path(settings.environments_dir)
    
    # Try to find the file
    env_file_path = None
    
    # Try to find by splitting env_id
    parts = env_id.split('-', 1)
    if len(parts) == 2:
        api_name, env_name = parts
        api_dir = environments_dir / api_name
        if api_dir.exists():
            # Try different file naming patterns
            for pattern in [
                f"{api_name}-{env_name}.postman_environment.json",
                f"{api_name}-{env_name}.json",
                f"{api_name}.{env_name}.json"
            ]:
                potential_file = api_dir / pattern
                if potential_file.exists():
                    env_file_path = potential_file
                    break
    
    # If still not found, search all directories
    if not env_file_path:
        for api_dir in environments_dir.iterdir():
            if api_dir.is_dir():
                for file_path in api_dir.glob("*"):
                    if file_path.is_file() and env_id in file_path.stem:
                        env_file_path = file_path
                        break
                if env_file_path:
                    break
    
    if not env_file_path or not env_file_path.exists():
        raise HTTPException(status_code=404, detail="Environment file not found")
    
    # Delete the file
    env_file_path.unlink()
    
    return {"message": "Environment file deleted successfully"}


@router.get("")
async def list_environments():
    """List all environment files."""
    environments_dir = Path(settings.environments_dir)
    if not environments_dir.exists():
        return {"environments": []}
    
    environments = []
    for api_dir in environments_dir.iterdir():
        if api_dir.is_dir():
            for env_file in api_dir.glob("*.json"):
                if env_file.is_file():
                    # Try to parse environment file to get name
                    try:
                        with open(env_file, 'r', encoding='utf-8') as f:
                            env_data = json.load(f)
                            env_name = env_data.get("name", env_file.stem)
                            env_id = env_data.get("id", f"{api_dir.name}-{env_file.stem}")
                    except (json.JSONDecodeError, IOError, OSError) as e:
                        # Log error but continue with fallback values
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Failed to parse environment file {env_file}: {str(e)}")
                        env_name = env_file.stem
                        env_id = f"{api_dir.name}-{env_file.stem}"
                    
                    environments.append({
                        "id": env_id,
                        "name": env_name,
                        "api_name": api_dir.name,
                        "path": str(env_file),
                        "size": env_file.stat().st_size
                    })
    
    return {"environments": environments}
