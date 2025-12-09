"""
Global Headers API endpoints.
Provides CRUD operations for managing global headers.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
from app.config import settings

router = APIRouter()

# In-memory storage for global headers (in production, use a database)
global_headers_store: Dict[str, Dict[str, Any]] = {}

# File path for persistent storage
HEADERS_FILE = Path("Backend/MasterData/global_headers.json")


def load_headers_from_file():
    """Load global headers from file."""
    global global_headers_store
    if HEADERS_FILE.exists():
        try:
            with open(HEADERS_FILE, 'r', encoding='utf-8') as f:
                global_headers_store = json.load(f)
        except Exception as e:
            print(f"Error loading headers from file: {e}")
            global_headers_store = {}
    else:
        global_headers_store = {}


def save_headers_to_file():
    """Save global headers to file."""
    HEADERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(HEADERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(global_headers_store, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving headers to file: {e}")


# Load headers on module import
load_headers_from_file()


class GlobalHeader(BaseModel):
    """Global header model."""
    id: Optional[str] = None
    key: str
    value: str
    description: Optional[str] = ""
    enabled: bool = True


class GlobalHeaderResponse(BaseModel):
    """Global header response model."""
    id: str
    key: str
    value: str
    description: str
    enabled: bool


@router.get("/", response_model=List[GlobalHeaderResponse])
async def get_global_headers():
    """Get all global headers."""
    headers = []
    for header_id, header_data in global_headers_store.items():
        headers.append(GlobalHeaderResponse(
            id=header_id,
            key=header_data.get('key', ''),
            value=header_data.get('value', ''),
            description=header_data.get('description', ''),
            enabled=header_data.get('enabled', True)
        ))
    return sorted(headers, key=lambda x: x.key)


@router.get("/{header_id}", response_model=GlobalHeaderResponse)
async def get_global_header(header_id: str):
    """Get a specific global header by ID."""
    if header_id not in global_headers_store:
        raise HTTPException(status_code=404, detail="Header not found")
    
    header_data = global_headers_store[header_id]
    return GlobalHeaderResponse(
        id=header_id,
        key=header_data.get('key', ''),
        value=header_data.get('value', ''),
        description=header_data.get('description', ''),
        enabled=header_data.get('enabled', True)
    )


@router.post("/", response_model=GlobalHeaderResponse)
async def create_global_header(header: GlobalHeader):
    """Create a new global header."""
    import uuid
    header_id = header.id or str(uuid.uuid4())
    
    # Check if key already exists
    for existing_id, existing_header in global_headers_store.items():
        if existing_header.get('key') == header.key and existing_id != header_id:
            raise HTTPException(status_code=400, detail=f"Header with key '{header.key}' already exists")
    
    global_headers_store[header_id] = {
        "key": header.key,
        "value": header.value,
        "description": header.description or "",
        "enabled": header.enabled
    }
    
    save_headers_to_file()
    
    return GlobalHeaderResponse(
        id=header_id,
        key=header.key,
        value=header.value,
        description=header.description or "",
        enabled=header.enabled
    )


@router.put("/{header_id}", response_model=GlobalHeaderResponse)
async def update_global_header(header_id: str, header: GlobalHeader):
    """Update an existing global header."""
    if header_id not in global_headers_store:
        raise HTTPException(status_code=404, detail="Header not found")
    
    # Check if key already exists in another header
    for existing_id, existing_header in global_headers_store.items():
        if existing_header.get('key') == header.key and existing_id != header_id:
            raise HTTPException(status_code=400, detail=f"Header with key '{header.key}' already exists")
    
    global_headers_store[header_id] = {
        "key": header.key,
        "value": header.value,
        "description": header.description or "",
        "enabled": header.enabled
    }
    
    save_headers_to_file()
    
    return GlobalHeaderResponse(
        id=header_id,
        key=header.key,
        value=header.value,
        description=header.description or "",
        enabled=header.enabled
    )


@router.delete("/{header_id}")
async def delete_global_header(header_id: str):
    """Delete a global header."""
    if header_id not in global_headers_store:
        raise HTTPException(status_code=404, detail="Header not found")
    
    del global_headers_store[header_id]
    save_headers_to_file()
    
    return {"message": "Header deleted successfully"}


@router.get("/enabled/list", response_model=List[Dict[str, str]])
async def get_enabled_headers():
    """Get all enabled global headers as a simple list for use in conversions."""
    headers = []
    for header_data in global_headers_store.values():
        if header_data.get('enabled', True):
            headers.append({
                "key": header_data.get('key', ''),
                "value": header_data.get('value', '')
            })
    return headers

