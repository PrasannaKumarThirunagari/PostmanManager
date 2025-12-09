"""
Status-Based Scripts API endpoints.
Provides CRUD operations for managing scripts associated with HTTP status codes.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import json

router = APIRouter()

# In-memory storage for status scripts (in production, use a database)
status_scripts_store: Dict[str, Dict[str, Any]] = {}

# File path for persistent storage
# Try multiple possible paths
SCRIPTS_FILE = Path("Backend/MasterData/status_scripts.json")
SCRIPTS_FILE_ALT = Path("Backend/Backend/MasterData/status_scripts.json")


def load_scripts_from_file():
    """Load status scripts from file."""
    global status_scripts_store
    # Try primary path first, then alternative path
    file_path = SCRIPTS_FILE if SCRIPTS_FILE.exists() else (SCRIPTS_FILE_ALT if SCRIPTS_FILE_ALT.exists() else None)
    
    if file_path:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Handle both formats: flat dict or dict with 'scripts' key
                if isinstance(data, dict):
                    if 'scripts' in data:
                        # Convert list to dict format
                        status_scripts_store = {}
                        for script in data['scripts']:
                            script_id = script.get('id')
                            if script_id:
                                status_scripts_store[script_id] = script
                    else:
                        # Already in dict format (keyed by script ID)
                        status_scripts_store = data
                elif isinstance(data, list):
                    # Handle list format
                    status_scripts_store = {}
                    for script in data:
                        script_id = script.get('id')
                        if script_id:
                            status_scripts_store[script_id] = script
                else:
                    status_scripts_store = {}
        except Exception as e:
            print(f"Error loading scripts from file: {e}")
            status_scripts_store = {}
    else:
        status_scripts_store = {}


def save_scripts_to_file():
    """Save status scripts to file."""
    # Use the file that exists, or default to primary path
    file_path = SCRIPTS_FILE_ALT if SCRIPTS_FILE_ALT.exists() else SCRIPTS_FILE
    file_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Save in dict format (keyed by script ID) for easier lookup
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(status_scripts_store, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving scripts to file: {e}")


# Load scripts on module import
load_scripts_from_file()


class StatusScript(BaseModel):
    """Status script model."""
    id: Optional[str] = None
    status_code: str  # e.g., "200", "404", "500", "2XX", "4XX"
    script_type: str  # "pre-request" or "test"
    script: str
    description: Optional[str] = ""
    enabled: bool = True


class StatusScriptResponse(BaseModel):
    """Status script response model."""
    id: str
    status_code: str
    script_type: str
    script: str
    description: str
    enabled: bool


@router.get("/", response_model=List[StatusScriptResponse])
async def get_status_scripts():
    """Get all status scripts."""
    scripts = []
    for script_id, script_data in status_scripts_store.items():
        scripts.append(StatusScriptResponse(
            id=script_id,
            status_code=script_data.get('status_code', ''),
            script_type=script_data.get('script_type', 'test'),
            script=script_data.get('script', ''),
            description=script_data.get('description', ''),
            enabled=script_data.get('enabled', True)
        ))
    return sorted(scripts, key=lambda x: (x.status_code, x.script_type))


@router.get("/{script_id}", response_model=StatusScriptResponse)
async def get_status_script(script_id: str):
    """Get a specific status script by ID."""
    if script_id not in status_scripts_store:
        raise HTTPException(status_code=404, detail="Script not found")
    
    script_data = status_scripts_store[script_id]
    return StatusScriptResponse(
        id=script_id,
        status_code=script_data.get('status_code', ''),
        script_type=script_data.get('script_type', 'test'),
        script=script_data.get('script', ''),
        description=script_data.get('description', ''),
        enabled=script_data.get('enabled', True)
    )


@router.post("/", response_model=StatusScriptResponse)
async def create_status_script(script: StatusScript):
    """Create a new status script."""
    import uuid
    script_id = script.id or str(uuid.uuid4())
    
    if script.script_type not in ['pre-request', 'test']:
        raise HTTPException(status_code=400, detail="script_type must be 'pre-request' or 'test'")
    
    status_scripts_store[script_id] = {
        "status_code": script.status_code,
        "script_type": script.script_type,
        "script": script.script,
        "description": script.description or "",
        "enabled": script.enabled
    }
    
    save_scripts_to_file()
    
    return StatusScriptResponse(
        id=script_id,
        status_code=script.status_code,
        script_type=script.script_type,
        script=script.script,
        description=script.description or "",
        enabled=script.enabled
    )


@router.put("/{script_id}", response_model=StatusScriptResponse)
async def update_status_script(script_id: str, script: StatusScript):
    """Update an existing status script."""
    if script_id not in status_scripts_store:
        raise HTTPException(status_code=404, detail="Script not found")
    
    if script.script_type not in ['pre-request', 'test']:
        raise HTTPException(status_code=400, detail="script_type must be 'pre-request' or 'test'")
    
    status_scripts_store[script_id] = {
        "status_code": script.status_code,
        "script_type": script.script_type,
        "script": script.script,
        "description": script.description or "",
        "enabled": script.enabled
    }
    
    save_scripts_to_file()
    
    return StatusScriptResponse(
        id=script_id,
        status_code=script.status_code,
        script_type=script.script_type,
        script=script.script,
        description=script.description or "",
        enabled=script.enabled
    )


@router.delete("/{script_id}")
async def delete_status_script(script_id: str):
    """Delete a status script."""
    if script_id not in status_scripts_store:
        raise HTTPException(status_code=404, detail="Script not found")
    
    del status_scripts_store[script_id]
    save_scripts_to_file()
    
    return {"message": "Script deleted successfully"}


@router.get("/status/{status_code}", response_model=List[StatusScriptResponse])
async def get_scripts_by_status(status_code: str):
    """Get all scripts for a specific status code."""
    scripts = []
    for script_id, script_data in status_scripts_store.items():
        if script_data.get('status_code') == status_code and script_data.get('enabled', True):
            scripts.append(StatusScriptResponse(
                id=script_id,
                status_code=script_data.get('status_code', ''),
                script_type=script_data.get('script_type', 'test'),
                script=script_data.get('script', ''),
                description=script_data.get('description', ''),
                enabled=script_data.get('enabled', True)
            ))
    return sorted(scripts, key=lambda x: x.script_type)


def get_scripts_for_status_codes(status_codes: List[int]) -> Dict[str, List[str]]:
    """
    Get all enabled scripts for multiple status codes, including range matches (2XX, 4XX, etc.).
    Merges scripts from all matching status codes and avoids duplicates.
    Returns a dictionary with 'prerequest' and 'test' keys, each containing a list of script code lines.
    """
    result = {
        'prerequest': [],
        'test': []
    }
    
    seen_scripts = set()  # To avoid duplicates based on script content
    
    for status_code in status_codes:
        # Convert status code to string for exact match
        status_str = str(status_code)
        
        # Determine status range (2XX, 4XX, etc.)
        status_range = None
        if 200 <= status_code < 300:
            status_range = '2XX'
        elif 300 <= status_code < 400:
            status_range = '3XX'
        elif 400 <= status_code < 500:
            status_range = '4XX'
        elif 500 <= status_code < 600:
            status_range = '5XX'
        
        # Collect scripts - check exact match first, then range match
        scripts_to_check = [status_str]
        if status_range:
            scripts_to_check.append(status_range)
        
        for check_code in scripts_to_check:
            for script_data in status_scripts_store.values():
                if (script_data.get('status_code') == check_code and 
                    script_data.get('enabled', True)):
                    script_type = script_data.get('script_type', 'test')
                    script_code = script_data.get('script', '').strip()
                    
                    if not script_code:
                        continue
                    
                    # Normalize script_type: 'pre-request' -> 'prerequest' for Postman
                    normalized_script_type = script_type.replace('-', '') if script_type else 'test'
                    
                    # Create a unique key to avoid duplicates (normalize whitespace)
                    normalized_script = '\n'.join(line.strip() for line in script_code.split('\n') if line.strip())
                    script_key = f"{normalized_script_type}:{normalized_script}"
                    
                    if script_key not in seen_scripts:
                        seen_scripts.add(script_key)
                        # Split script into lines for Postman exec array
                        # Handle both Unix (\n) and Windows (\r\n) line endings
                        script_lines = script_code.replace('\r\n', '\n').split('\n')
                        # Keep all lines including empty ones (Postman needs them for proper formatting)
                        # Only remove trailing empty lines
                        while script_lines and not script_lines[-1].strip():
                            script_lines.pop()
                        if normalized_script_type == 'prerequest':
                            result['prerequest'].extend(script_lines)
                        elif normalized_script_type == 'test':
                            result['test'].extend(script_lines)
    
    return result

