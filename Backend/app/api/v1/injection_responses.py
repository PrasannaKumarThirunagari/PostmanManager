"""
API endpoints for managing injection response configurations.
Allows configuring 400 response messages for different injection types (XSS, SQL, HTML).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from pathlib import Path
import json
import uuid

router = APIRouter(prefix="/api/v1/injection-responses", tags=["injection-responses"])

# File path for persistent storage
RESPONSES_FILE = Path("Backend/MasterData/injection_responses.json")
RESPONSES_FILE_ALT = Path("Backend/Backend/MasterData/injection_responses.json")

# In-memory store
injection_responses_store: Dict[str, Dict] = {}


class InjectionResponse(BaseModel):
    """Injection response configuration model."""
    id: Optional[str] = None
    injection_type: str  # 'xss', 'sql', 'html'
    status_code: int = 400
    message: str
    enabled: bool = True


class InjectionResponseResponse(BaseModel):
    """Response model for injection response."""
    id: str
    injection_type: str
    status_code: int
    message: str
    enabled: bool


def load_responses_from_file():
    """Load injection responses from file."""
    global injection_responses_store
    # Try primary path first, then alternative path
    file_path = RESPONSES_FILE if RESPONSES_FILE.exists() else (RESPONSES_FILE_ALT if RESPONSES_FILE_ALT.exists() else None)
    
    if file_path:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Handle both formats: flat dict or dict with 'responses' key
                if isinstance(data, dict):
                    if 'responses' in data:
                        # Convert list to dict format
                        injection_responses_store = {}
                        for response in data['responses']:
                            response_id = response.get('id')
                            if response_id:
                                injection_responses_store[response_id] = response
                    else:
                        # Already in dict format (keyed by response ID)
                        injection_responses_store = data
                elif isinstance(data, list):
                    # Handle list format
                    injection_responses_store = {}
                    for response in data:
                        response_id = response.get('id')
                        if response_id:
                            injection_responses_store[response_id] = response
                else:
                    injection_responses_store = {}
        except Exception as e:
            print(f"Error loading injection responses from file: {e}")
            injection_responses_store = {}
    else:
        injection_responses_store = {}


def save_responses_to_file():
    """Save injection responses to file."""
    # Use the file that exists, or default to primary path
    file_path = RESPONSES_FILE_ALT if RESPONSES_FILE_ALT.exists() else RESPONSES_FILE
    file_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Save in dict format (keyed by response ID) for easier lookup
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(injection_responses_store, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving injection responses to file: {e}")


# Load responses on module import
load_responses_from_file()


@router.get("/", response_model=List[InjectionResponseResponse])
async def get_all_injection_responses():
    """Get all injection response configurations."""
    return [
        InjectionResponseResponse(
            id=response_id,
            injection_type=response_data.get('injection_type', ''),
            status_code=response_data.get('status_code', 400),
            message=response_data.get('message', ''),
            enabled=response_data.get('enabled', True)
        )
        for response_id, response_data in injection_responses_store.items()
    ]


@router.get("/{response_id}", response_model=InjectionResponseResponse)
async def get_injection_response(response_id: str):
    """Get a specific injection response configuration by ID."""
    if response_id not in injection_responses_store:
        raise HTTPException(status_code=404, detail="Injection response not found")
    
    response_data = injection_responses_store[response_id]
    return InjectionResponseResponse(
        id=response_id,
        injection_type=response_data.get('injection_type', ''),
        status_code=response_data.get('status_code', 400),
        message=response_data.get('message', ''),
        enabled=response_data.get('enabled', True)
    )


@router.get("/type/{injection_type}", response_model=Optional[InjectionResponseResponse])
async def get_injection_response_by_type(injection_type: str):
    """Get injection response configuration by injection type (xss, sql, html)."""
    injection_type_lower = injection_type.lower()
    for response_id, response_data in injection_responses_store.items():
        if (response_data.get('injection_type', '').lower() == injection_type_lower and
            response_data.get('enabled', True)):
            return InjectionResponseResponse(
                id=response_id,
                injection_type=response_data.get('injection_type', ''),
                status_code=response_data.get('status_code', 400),
                message=response_data.get('message', ''),
                enabled=response_data.get('enabled', True)
            )
    return None


@router.post("/", response_model=InjectionResponseResponse)
async def create_injection_response(response: InjectionResponse):
    """Create a new injection response configuration."""
    if response.injection_type.lower() not in ['xss', 'sql', 'html']:
        raise HTTPException(status_code=400, detail="injection_type must be 'xss', 'sql', or 'html'")
    
    response_id = response.id or str(uuid.uuid4())
    
    injection_responses_store[response_id] = {
        "id": response_id,
        "injection_type": response.injection_type.lower(),
        "status_code": response.status_code,
        "message": response.message,
        "enabled": response.enabled
    }
    
    save_responses_to_file()
    
    return InjectionResponseResponse(
        id=response_id,
        injection_type=response.injection_type.lower(),
        status_code=response.status_code,
        message=response.message,
        enabled=response.enabled
    )


@router.put("/{response_id}", response_model=InjectionResponseResponse)
async def update_injection_response(response_id: str, response: InjectionResponse):
    """Update an existing injection response configuration."""
    if response_id not in injection_responses_store:
        raise HTTPException(status_code=404, detail="Injection response not found")
    
    if response.injection_type.lower() not in ['xss', 'sql', 'html']:
        raise HTTPException(status_code=400, detail="injection_type must be 'xss', 'sql', or 'html'")
    
    injection_responses_store[response_id] = {
        "id": response_id,
        "injection_type": response.injection_type.lower(),
        "status_code": response.status_code,
        "message": response.message,
        "enabled": response.enabled
    }
    
    save_responses_to_file()
    
    return InjectionResponseResponse(
        id=response_id,
        injection_type=response.injection_type.lower(),
        status_code=response.status_code,
        message=response.message,
        enabled=response.enabled
    )


@router.delete("/{response_id}")
async def delete_injection_response(response_id: str):
    """Delete an injection response configuration."""
    if response_id not in injection_responses_store:
        raise HTTPException(status_code=404, detail="Injection response not found")
    
    del injection_responses_store[response_id]
    save_responses_to_file()
    
    return {"message": "Injection response deleted successfully"}


def get_response_for_injection_type(injection_type: str) -> Optional[Dict]:
    """
    Get enabled response configuration for a specific injection type.
    Returns None if no enabled response is found.
    """
    injection_type_lower = injection_type.lower()
    for response_data in injection_responses_store.values():
        if (response_data.get('injection_type', '').lower() == injection_type_lower and
            response_data.get('enabled', True)):
            return {
                "status_code": response_data.get('status_code', 400),
                "message": response_data.get('message', 'Bad Request')
            }
    return None

