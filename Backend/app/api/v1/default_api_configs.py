"""
Default API Configuration Variables API endpoints.
Provides CRUD operations for managing default API configuration variables
that are used when generating environment files.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import json

router = APIRouter()

# In-memory storage for default API configs (in production, use a database)
default_configs_store: Dict[str, Dict[str, Any]] = {}

# File path for persistent storage
CONFIGS_FILE = Path("Backend/MasterData/default_api_configs.json")


def load_configs_from_file():
    """Load default API configs from file."""
    global default_configs_store
    if CONFIGS_FILE.exists():
        try:
            with open(CONFIGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Convert list to dict for easier lookup
                if isinstance(data, dict) and 'configs' in data:
                    for config in data['configs']:
                        config_id = config.get('id')
                        if config_id:
                            default_configs_store[config_id] = config
                elif isinstance(data, list):
                    for config in data:
                        config_id = config.get('id')
                        if config_id:
                            default_configs_store[config_id] = config
        except Exception as e:
            print(f"Error loading default API configs from file: {e}")
            default_configs_store = {}
    else:
        default_configs_store = {}


def save_configs_to_file():
    """Save default API configs to file."""
    CONFIGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Convert dict back to list format
        configs_list = list(default_configs_store.values())
        with open(CONFIGS_FILE, 'w', encoding='utf-8') as f:
            json.dump({"configs": configs_list}, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving default API configs to file: {e}")


# Load configs on module import
load_configs_from_file()


class VariableConfig(BaseModel):
    """Variable configuration model."""
    key: str
    value: str
    description: Optional[str] = ""


class DefaultAPIConfig(BaseModel):
    """Default API configuration model."""
    id: Optional[str] = None
    api_name: str
    environment: str  # local, dev, qa, uat, prod
    variables: Dict[str, str]  # key-value pairs of variables
    description: Optional[str] = ""
    enabled: bool = True


class DefaultAPIConfigResponse(BaseModel):
    """Default API configuration response model."""
    id: str
    api_name: str
    environment: str
    variables: Dict[str, str]
    description: str
    enabled: bool


def get_config_key(api_name: str, environment: str) -> str:
    """Generate a unique key for API config lookup."""
    return f"{api_name}::{environment}"


@router.get("/", response_model=List[DefaultAPIConfigResponse])
async def get_default_api_configs():
    """Get all default API configurations."""
    configs = []
    for config_data in default_configs_store.values():
        configs.append(DefaultAPIConfigResponse(
            id=config_data.get('id', ''),
            api_name=config_data.get('api_name', ''),
            environment=config_data.get('environment', ''),
            variables=config_data.get('variables', {}),
            description=config_data.get('description', ''),
            enabled=config_data.get('enabled', True)
        ))
    return sorted(configs, key=lambda x: (x.api_name, x.environment))


@router.get("/{config_id}", response_model=DefaultAPIConfigResponse)
async def get_default_api_config(config_id: str):
    """Get a specific default API configuration by ID."""
    if config_id not in default_configs_store:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    config_data = default_configs_store[config_id]
    return DefaultAPIConfigResponse(
        id=config_id,
        api_name=config_data.get('api_name', ''),
        environment=config_data.get('environment', ''),
        variables=config_data.get('variables', {}),
        description=config_data.get('description', ''),
        enabled=config_data.get('enabled', True)
    )


@router.get("/api/{api_name}/environment/{environment}", response_model=Optional[DefaultAPIConfigResponse])
async def get_config_by_api_and_env(api_name: str, environment: str):
    """Get default API configuration by API name and environment."""
    config_key = get_config_key(api_name, environment)
    
    # Try exact match first
    for config_id, config_data in default_configs_store.items():
        if config_data.get('api_name') == api_name and config_data.get('environment') == environment:
            if config_data.get('enabled', True):
                return DefaultAPIConfigResponse(
                    id=config_id,
                    api_name=config_data.get('api_name', ''),
                    environment=config_data.get('environment', ''),
                    variables=config_data.get('variables', {}),
                    description=config_data.get('description', ''),
                    enabled=config_data.get('enabled', True)
                )
    
    return None


@router.post("/", response_model=DefaultAPIConfigResponse)
async def create_default_api_config(config: DefaultAPIConfig):
    """Create a new default API configuration."""
    import uuid
    config_id = config.id or str(uuid.uuid4())
    
    # Check if config already exists for this API and environment
    for existing_id, existing_config in default_configs_store.items():
        if (existing_config.get('api_name') == config.api_name and 
            existing_config.get('environment') == config.environment and
            existing_id != config_id):
            raise HTTPException(
                status_code=400, 
                detail=f"Configuration already exists for API '{config.api_name}' and environment '{config.environment}'"
            )
    
    default_configs_store[config_id] = {
        "id": config_id,
        "api_name": config.api_name,
        "environment": config.environment,
        "variables": config.variables,
        "description": config.description or "",
        "enabled": config.enabled
    }
    
    save_configs_to_file()
    
    return DefaultAPIConfigResponse(
        id=config_id,
        api_name=config.api_name,
        environment=config.environment,
        variables=config.variables,
        description=config.description or "",
        enabled=config.enabled
    )


@router.put("/{config_id}", response_model=DefaultAPIConfigResponse)
async def update_default_api_config(config_id: str, config: DefaultAPIConfig):
    """Update an existing default API configuration."""
    if config_id not in default_configs_store:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # Check if another config exists for this API and environment
    for existing_id, existing_config in default_configs_store.items():
        if (existing_config.get('api_name') == config.api_name and 
            existing_config.get('environment') == config.environment and
            existing_id != config_id):
            raise HTTPException(
                status_code=400, 
                detail=f"Configuration already exists for API '{config.api_name}' and environment '{config.environment}'"
            )
    
    default_configs_store[config_id] = {
        "id": config_id,
        "api_name": config.api_name,
        "environment": config.environment,
        "variables": config.variables,
        "description": config.description or "",
        "enabled": config.enabled
    }
    
    save_configs_to_file()
    
    return DefaultAPIConfigResponse(
        id=config_id,
        api_name=config.api_name,
        environment=config.environment,
        variables=config.variables,
        description=config.description or "",
        enabled=config.enabled
    )


@router.delete("/{config_id}")
async def delete_default_api_config(config_id: str):
    """Delete a default API configuration."""
    if config_id not in default_configs_store:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    del default_configs_store[config_id]
    save_configs_to_file()
    
    return {"message": "Configuration deleted successfully"}


def sanitize_name_for_matching(name: str) -> str:
    """Sanitize API name for matching (same logic as SwaggerParser.sanitize_name)."""
    import re
    # Remove special characters, replace spaces with hyphens
    sanitized = re.sub(r'[^\w\s-]', '', name)
    sanitized = re.sub(r'[-\s]+', '-', sanitized)
    return sanitized.strip('-').lower()


def get_default_values_for_variables(api_name: str, environment: str, variable_names: List[str]) -> Dict[str, str]:
    """
    Get default values for variables based on API name, environment, and variable names.
    Returns a dictionary mapping variable names to their default values.
    
    Matching logic:
    - Matches by sanitized API name (case-insensitive, handles spaces/special chars)
    - Matches by exact API name (case-sensitive) as fallback
    - Matches by environment (exact match)
    """
    # Sanitize the input API name for comparison
    sanitized_api_name = sanitize_name_for_matching(api_name)
    
    # Try to find matching config
    for config_data in default_configs_store.values():
        config_api_name = config_data.get('api_name', '')
        config_env = config_data.get('environment', '')
        
        # Sanitize the stored API name for comparison
        sanitized_config_api_name = sanitize_name_for_matching(config_api_name)
        
        # Match by sanitized name (flexible) or exact name (fallback)
        api_name_matches = (
            sanitized_config_api_name == sanitized_api_name or  # Sanitized match (flexible)
            config_api_name == api_name or  # Exact match (case-sensitive)
            config_api_name.lower() == api_name.lower()  # Case-insensitive exact match
        )
        
        # Environment must match exactly
        env_matches = config_env == environment
        
        if api_name_matches and env_matches and config_data.get('enabled', True):
            variables = config_data.get('variables', {})
            result = {}
            for var_name in variable_names:
                if var_name in variables:
                    result[var_name] = variables[var_name]
            return result
    
    return {}

