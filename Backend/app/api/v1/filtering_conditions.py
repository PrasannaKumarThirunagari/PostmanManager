"""
Filtering conditions master data management endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import uuid
from datetime import datetime
import logging
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Master data file path
MASTER_DATA_DIR = Path("Backend/MasterData")
MASTER_DATA_FILE = MASTER_DATA_DIR / "filtering_conditions.json"


class FilteringCondition(BaseModel):
    """Filtering condition model."""
    id: Optional[str] = None
    dataType: str
    key: str
    value: str
    enabled: bool = True
    description: Optional[str] = None


class FilteringConditionRequest(BaseModel):
    """Request model for creating/updating filtering condition."""
    dataType: str
    key: str
    value: str
    enabled: bool = True
    description: Optional[str] = None


def ensure_master_data_file():
    """Ensure master data file and directory exist."""
    MASTER_DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not MASTER_DATA_FILE.exists():
        # Initialize with empty structure
        initial_data = {"conditions": []}
        with open(MASTER_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Created master data file: {MASTER_DATA_FILE}")


def load_conditions() -> Dict[str, Any]:
    """Load conditions from master data file."""
    ensure_master_data_file()
    try:
        with open(MASTER_DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get("conditions", [])
    except (IOError, json.JSONDecodeError) as e:
        logger.error(f"Error loading conditions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load conditions: {str(e)}")


def save_conditions(conditions: List[Dict[str, Any]]):
    """Save conditions to master data file."""
    ensure_master_data_file()
    try:
        data = {"conditions": conditions}
        with open(MASTER_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved {len(conditions)} conditions to master data file")
    except (IOError, json.JSONEncodeError) as e:
        logger.error(f"Error saving conditions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save conditions: {str(e)}")


@router.get("")
async def list_conditions():
    """List all filtering conditions."""
    conditions = load_conditions()
    return {
        "conditions": conditions,
        "count": len(conditions)
    }


@router.get("/by-datatype/{data_type}")
async def get_conditions_by_datatype(data_type: str):
    """Get filtering conditions for a specific data type."""
    conditions = load_conditions()
    filtered = [c for c in conditions if c.get("dataType", "").lower() == data_type.lower() and c.get("enabled", True)]
    return {
        "conditions": filtered,
        "dataType": data_type,
        "count": len(filtered)
    }


@router.get("/keys/{data_type}")
async def get_condition_keys_by_datatype(data_type: str):
    """Get only condition keys (names) for a specific data type - used by Grid Filtering."""
    conditions = load_conditions()
    filtered = [c.get("key") for c in conditions if c.get("dataType", "").lower() == data_type.lower() and c.get("enabled", True)]
    return {
        "keys": filtered,
        "dataType": data_type,
        "count": len(filtered)
    }


@router.post("")
async def create_condition(condition: FilteringConditionRequest):
    """Create a new filtering condition."""
    conditions = load_conditions()
    
    # Check for duplicate (same dataType and key)
    for existing in conditions:
        if existing.get("dataType", "").lower() == condition.dataType.lower() and existing.get("key", "").upper() == condition.key.upper():
            raise HTTPException(status_code=400, detail=f"Condition with dataType '{condition.dataType}' and key '{condition.key}' already exists")
    
    # Create new condition
    new_condition = {
        "id": str(uuid.uuid4()),
        "dataType": condition.dataType,
        "key": condition.key,
        "value": condition.value,
        "enabled": condition.enabled,
        "description": condition.description or "",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    conditions.append(new_condition)
    save_conditions(conditions)
    
    logger.info(f"Created new condition: {new_condition['id']} ({condition.dataType}/{condition.key})")
    
    return {
        "message": "Condition created successfully",
        "condition": new_condition
    }


@router.put("/{condition_id}")
async def update_condition(condition_id: str, condition: FilteringConditionRequest):
    """Update an existing filtering condition."""
    conditions = load_conditions()
    
    # Find the condition
    condition_index = None
    for idx, existing in enumerate(conditions):
        if existing.get("id") == condition_id:
            condition_index = idx
            break
    
    if condition_index is None:
        raise HTTPException(status_code=404, detail="Condition not found")
    
    # Check for duplicate (same dataType and key) with different ID
    for existing in conditions:
        if existing.get("id") != condition_id and existing.get("dataType", "").lower() == condition.dataType.lower() and existing.get("key", "").upper() == condition.key.upper():
            raise HTTPException(status_code=400, detail=f"Condition with dataType '{condition.dataType}' and key '{condition.key}' already exists")
    
    # Update the condition
    updated_condition = {
        **conditions[condition_index],
        "dataType": condition.dataType,
        "key": condition.key,
        "value": condition.value,
        "enabled": condition.enabled,
        "description": condition.description or "",
        "updated_at": datetime.now().isoformat()
    }
    
    conditions[condition_index] = updated_condition
    save_conditions(conditions)
    
    logger.info(f"Updated condition: {condition_id} ({condition.dataType}/{condition.key})")
    
    return {
        "message": "Condition updated successfully",
        "condition": updated_condition
    }


@router.delete("/{condition_id}")
async def delete_condition(condition_id: str):
    """Delete a filtering condition."""
    conditions = load_conditions()
    
    # Find and remove the condition
    original_count = len(conditions)
    conditions = [c for c in conditions if c.get("id") != condition_id]
    
    if len(conditions) == original_count:
        raise HTTPException(status_code=404, detail="Condition not found")
    
    save_conditions(conditions)
    
    logger.info(f"Deleted condition: {condition_id}")
    
    return {
        "message": "Condition deleted successfully",
        "condition_id": condition_id
    }


@router.patch("/{condition_id}/toggle")
async def toggle_condition(condition_id: str):
    """Toggle enable/disable status of a condition."""
    conditions = load_conditions()
    
    # Find the condition
    condition_index = None
    for idx, existing in enumerate(conditions):
        if existing.get("id") == condition_id:
            condition_index = idx
            break
    
    if condition_index is None:
        raise HTTPException(status_code=404, detail="Condition not found")
    
    # Toggle enabled status
    current_enabled = conditions[condition_index].get("enabled", True)
    conditions[condition_index]["enabled"] = not current_enabled
    conditions[condition_index]["updated_at"] = datetime.now().isoformat()
    
    save_conditions(conditions)
    
    logger.info(f"Toggled condition {condition_id}: {'enabled' if not current_enabled else 'disabled'}")
    
    return {
        "message": f"Condition {'enabled' if not current_enabled else 'disabled'} successfully",
        "condition": conditions[condition_index]
    }


@router.post("/import")
async def import_conditions(conditions_data: Dict[str, Any]):
    """Import conditions from JSON data."""
    if "conditions" not in conditions_data:
        raise HTTPException(status_code=400, detail="Invalid import data: 'conditions' key is required")
    
    imported_conditions = conditions_data.get("conditions", [])
    existing_conditions = load_conditions()
    
    # Merge: add new, update existing (by dataType + key)
    existing_keys = {(c.get("dataType", "").lower(), c.get("key", "").upper()): idx for idx, c in enumerate(existing_conditions)}
    
    added_count = 0
    updated_count = 0
    
    for imported in imported_conditions:
        key = (imported.get("dataType", "").lower(), imported.get("key", "").upper())
        if key in existing_keys:
            # Update existing
            idx = existing_keys[key]
            existing_conditions[idx].update({
                "value": imported.get("value", ""),
                "enabled": imported.get("enabled", True),
                "description": imported.get("description", ""),
                "updated_at": datetime.now().isoformat()
            })
            updated_count += 1
        else:
            # Add new
            new_condition = {
                "id": str(uuid.uuid4()),
                "dataType": imported.get("dataType", ""),
                "key": imported.get("key", ""),
                "value": imported.get("value", ""),
                "enabled": imported.get("enabled", True),
                "description": imported.get("description", ""),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            existing_conditions.append(new_condition)
            added_count += 1
    
    save_conditions(existing_conditions)
    
    logger.info(f"Imported conditions: {added_count} added, {updated_count} updated")
    
    return {
        "message": f"Import completed: {added_count} added, {updated_count} updated",
        "added": added_count,
        "updated": updated_count,
        "total": len(existing_conditions)
    }


@router.get("/export")
async def export_conditions():
    """Export all conditions as JSON."""
    conditions = load_conditions()
    return {
        "conditions": conditions,
        "exported_at": datetime.now().isoformat(),
        "count": len(conditions)
    }

