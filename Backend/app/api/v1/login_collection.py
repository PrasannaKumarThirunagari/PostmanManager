"""
Login Postman collection management endpoints.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from pathlib import Path
import json
from app.config import settings

router = APIRouter()

# Store login collection in a dedicated directory
LOGIN_COLLECTION_DIR = Path("LoginCollection")
LOGIN_COLLECTION_FILE = LOGIN_COLLECTION_DIR / "login.postman_collection.json"


class LoginCollectionResponse(BaseModel):
    """Response model for login collection."""
    exists: bool
    name: Optional[str] = None
    item_count: Optional[int] = None
    message: Optional[str] = None


@router.post("/upload")
async def upload_login_collection(file: UploadFile = File(...)):
    """
    Upload a login Postman collection.
    The collection will be stored and appended to all converted collections.
    """
    # Validate file type
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    # Read file content
    try:
        content = await file.read()
        collection_data = json.loads(content.decode('utf-8'))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Validate Postman collection structure
    if "info" not in collection_data or "item" not in collection_data:
        raise HTTPException(status_code=400, detail="Invalid Postman collection structure. Must have 'info' and 'item' fields.")
    
    # Ensure directory exists
    LOGIN_COLLECTION_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save the collection as-is (no modifications)
    with open(LOGIN_COLLECTION_FILE, 'w', encoding='utf-8') as f:
        json.dump(collection_data, f, indent=2, ensure_ascii=False)
    
    # Count items
    item_count = len(collection_data.get("item", []))
    collection_name = collection_data.get("info", {}).get("name", "Login Collection")
    
    return {
        "message": "Login collection uploaded successfully",
        "name": collection_name,
        "item_count": item_count
    }


@router.get("")
async def get_login_collection():
    """
    Get the stored login collection information.
    """
    if not LOGIN_COLLECTION_FILE.exists():
        return LoginCollectionResponse(
            exists=False,
            message="No login collection uploaded yet"
        )
    
    try:
        with open(LOGIN_COLLECTION_FILE, 'r', encoding='utf-8') as f:
            collection_data = json.load(f)
        
        collection_name = collection_data.get("info", {}).get("name", "Login Collection")
        item_count = len(collection_data.get("item", []))
        
        return LoginCollectionResponse(
            exists=True,
            name=collection_name,
            item_count=item_count,
            message="Login collection found"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read login collection: {str(e)}")


@router.get("/collection")
async def get_login_collection_data():
    """
    Get the full login collection data.
    """
    if not LOGIN_COLLECTION_FILE.exists():
        raise HTTPException(status_code=404, detail="No login collection uploaded yet")
    
    try:
        with open(LOGIN_COLLECTION_FILE, 'r', encoding='utf-8') as f:
            collection_data = json.load(f)
        
        return collection_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read login collection: {str(e)}")


@router.delete("")
async def delete_login_collection():
    """
    Delete the stored login collection.
    """
    if not LOGIN_COLLECTION_FILE.exists():
        raise HTTPException(status_code=404, detail="No login collection to delete")
    
    try:
        LOGIN_COLLECTION_FILE.unlink()
        return {"message": "Login collection deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete login collection: {str(e)}")


def get_login_collection_items() -> Optional[list]:
    """
    Helper function to get login collection items.
    Returns None if no login collection exists.
    """
    if not LOGIN_COLLECTION_FILE.exists():
        return None
    
    try:
        with open(LOGIN_COLLECTION_FILE, 'r', encoding='utf-8') as f:
            collection_data = json.load(f)
        
        # Return the items array from the collection
        return collection_data.get("item", [])
    except Exception:
        return None

