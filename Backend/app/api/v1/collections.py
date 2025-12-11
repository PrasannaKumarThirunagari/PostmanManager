"""
Postman collection management endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
from app.config import settings

router = APIRouter()


@router.get("")
async def list_collections():
    """List all Postman collections."""
    collections_dir = Path(settings.postman_collections_dir)
    if not collections_dir.exists():
        return {"collections": []}
    
    collections = []
    for api_dir in collections_dir.iterdir():
        if api_dir.is_dir():
            collection_file = api_dir / f"{api_dir.name}.postman_collection.json"
            if collection_file.exists():
                collections.append({
                    "id": api_dir.name,
                    "name": api_dir.name,
                    "path": str(collection_file),
                    "size": collection_file.stat().st_size
                })
    
    return {"collections": collections}


@router.get("/{collection_id}")
async def get_collection(collection_id: str):
    """Get Postman collection details."""
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    # Sanitize collection_id to prevent path traversal
    collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
    if not collection_id:
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    
    collections_dir = Path(settings.postman_collections_dir)
    collection_dir = collections_dir / collection_id
    
    # Ensure path is within collections_dir (prevent path traversal)
    collection_dir = collection_dir.resolve()
    if not str(collection_dir).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not collection_dir.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    collection_file = collection_dir / f"{collection_id}.postman_collection.json"
    if not collection_file.exists():
        raise HTTPException(status_code=404, detail="Collection file not found")
    
    return {
        "id": collection_id,
        "name": collection_id,
        "path": str(collection_file),
        "size": collection_file.stat().st_size
    }


@router.delete("/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a Postman collection."""
    import re
    import logging
    import shutil
    logger = logging.getLogger(__name__)
    
    # Sanitize collection_id to prevent path traversal
    collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
    if not collection_id:
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    
    collections_dir = Path(settings.postman_collections_dir)
    collection_dir = collections_dir / collection_id
    
    # Ensure path is within collections_dir (prevent path traversal)
    collection_dir = collection_dir.resolve()
    if not str(collection_dir).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not collection_dir.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    try:
        # Delete the entire directory
        shutil.rmtree(collection_dir)
        logger.info(f"Collection deleted: {collection_id}")
        return {"message": "Collection deleted successfully"}
    except (IOError, OSError, shutil.Error) as e:
        logger.error(f"Failed to delete collection {collection_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete collection: {str(e)}")


@router.get("/{collection_id}/download")
async def download_collection(collection_id: str):
    """Download a Postman collection."""
    from fastapi.responses import FileResponse
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    # Sanitize collection_id to prevent path traversal
    collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
    if not collection_id:
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    
    collections_dir = Path(settings.postman_collections_dir)
    collection_file = collections_dir / collection_id / f"{collection_id}.postman_collection.json"
    
    # Ensure path is within collections_dir (prevent path traversal)
    collection_file = collection_file.resolve()
    if not str(collection_file).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not collection_file.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    return FileResponse(
        path=str(collection_file),
        filename=collection_file.name,
        media_type="application/json"
    )


def filter_injection_requests(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Filter out injection requests from collection items."""
    # Check if name contains "Injection" (case-insensitive)
    name = item.get("name", "").lower()
    if "injection" in name:
        return None  # Filter out this item
    
    # If it's a folder, recursively filter its items
    if "item" in item and isinstance(item["item"], list):
        filtered_items = []
        for sub_item in item["item"]:
            filtered = filter_injection_requests(sub_item)
            if filtered is not None:
                filtered_items.append(filtered)
        
        # If folder becomes empty after filtering, filter it out
        if not filtered_items:
            return None
        
        # Return folder with filtered items
        return {
            **item,
            "item": filtered_items
        }
    
    # Return request as-is (not an injection request)
    return item


@router.get("/{collection_id}/requests")
async def get_collection_requests(collection_id: str):
    """Get all requests from a collection, excluding injection requests (for UI display only)."""
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    # Sanitize collection_id to prevent path traversal
    collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
    if not collection_id:
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    
    collections_dir = Path(settings.postman_collections_dir)
    collection_file = collections_dir / collection_id / f"{collection_id}.postman_collection.json"
    
    # Ensure path is within collections_dir (prevent path traversal)
    collection_file = collection_file.resolve()
    if not str(collection_file).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not collection_file.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Load collection
    with open(collection_file, 'r', encoding='utf-8') as f:
        collection = json.load(f)
    
    # Filter out injection requests (for display only)
    filtered_items = []
    for item in collection.get("item", []):
        filtered = filter_injection_requests(item)
        if filtered is not None:
            filtered_items.append(filtered)
    
    return {
        "collection_id": collection_id,
        "collection_info": collection.get("info", {}),
        "items": filtered_items
    }


@router.get("/{collection_id}/full")
async def get_full_collection(collection_id: str):
    """Get full collection including injection requests (for preserving structure when saving)."""
    collections_dir = Path(settings.postman_collections_dir)
    collection_file = collections_dir / collection_id / f"{collection_id}.postman_collection.json"
    
    if not collection_file.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Load collection (no filtering - return everything)
    with open(collection_file, 'r', encoding='utf-8') as f:
        collection = json.load(f)
    
    return {
        "collection_id": collection_id,
        "collection_info": collection.get("info", {}),
        "items": collection.get("item", [])
    }


class UpdateCollectionRequest(BaseModel):
    """Request model for updating a collection."""
    collection: Dict[str, Any]


def merge_collection_items(original_items: List[Dict[str, Any]], updated_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge updated items into original structure while preserving injection requests."""
    def is_injection_request(item: Dict[str, Any]) -> bool:
        """Check if an item is an injection request."""
        name = item.get("name", "").lower()
        return "injection" in name
    
    def is_clone(item: Dict[str, Any]) -> bool:
        """Check if an item is a clone."""
        name = item.get("name", "").lower()
        return "(copy)" in name
    
    def find_matching_item(original_item: Dict[str, Any], updated_items: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find matching item in updated items by name and method (excluding clones)."""
        orig_name = original_item.get("name", "")
        orig_method = original_item.get("request", {}).get("method", "")
        
        for updated_item in updated_items:
            updated_name = updated_item.get("name", "")
            updated_method = updated_item.get("request", {}).get("method", "")
            
            # Skip injection requests when matching
            if is_injection_request(updated_item):
                continue
            
            # Skip clones when matching original requests
            if is_clone(updated_item):
                continue
            
            # Match by exact name and method
            if orig_name == updated_name and orig_method == updated_method:
                return updated_item
        return None
    
    # Flatten updated items to search through all of them (including nested)
    def flatten_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Flatten nested items for easier searching."""
        flat = []
        for item in items:
            if "item" in item and isinstance(item["item"], list):
                flat.extend(flatten_items(item["item"]))
            else:
                flat.append(item)
        return flat
    
    # Get all updated items (flattened) for matching
    all_updated_items = flatten_items(updated_items)
    processed_updated_names = set()  # Track processed items by name+method
    
    def is_injection_folder(item: Dict[str, Any]) -> bool:
        """Check if an item is an injection folder (folder containing injection requests)."""
        if "item" not in item or not isinstance(item.get("item"), list):
            return False
        name = item.get("name", "").lower()
        return "injection" in name
    
    def merge_recursive(original: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Recursively merge items, preserving injection requests and injection folders completely."""
        result = []
        
        for orig_item in original:
            # If it's a folder
            if "item" in orig_item and isinstance(orig_item["item"], list):
                # Always preserve injection folders completely (they contain injection requests)
                # Injection folders should never be merged - keep them exactly as they are
                if is_injection_folder(orig_item):
                    result.append(orig_item)
                else:
                    # Regular folder - recursively merge its items
                    merged_folder = {
                        **orig_item,
                        "item": merge_recursive(orig_item["item"])
                    }
                    result.append(merged_folder)
            # If it's a request
            elif "request" in orig_item:
                # Always preserve injection requests
                if is_injection_request(orig_item):
                    result.append(orig_item)
                else:
                    # Find matching updated item
                    matched = find_matching_item(orig_item, all_updated_items)
                    if matched:
                        # Use updated version
                        result.append(matched)
                        # Track that we've processed this item
                        key = f"{matched.get('name', '')}_{matched.get('request', {}).get('method', '')}"
                        processed_updated_names.add(key)
                    else:
                        # IMPORTANT: If not found in updates, keep the original request
                        # This ensures original requests are preserved
                        result.append(orig_item)
            else:
                # Unknown type, keep as-is
                result.append(orig_item)
        
        return result
    
    merged_result = merge_recursive(original_items)
    
    # Helper to find folder by name recursively
    def find_folder_by_name(items: List[Dict[str, Any]], folder_name: str) -> Optional[Dict[str, Any]]:
        """Recursively find a folder by name."""
        for item in items:
            if "item" in item and isinstance(item["item"], list):
                if item.get("name") == folder_name:
                    return item
                # Recursively search in nested folders
                found = find_folder_by_name(item["item"], folder_name)
                if found:
                    return found
        return None
    
    # Helper to clean internal tracking fields from an item
    def clean_item(item: Dict[str, Any]) -> Dict[str, Any]:
        """Remove internal tracking fields from an item."""
        return {k: v for k, v in item.items() 
                if k not in ["id", "path", "originalIndex", "parentPath", "parentFolderName", "folderReference"]}
    
    # Extract clones from updated_items and add them to correct folders
    # The frontend sends a nested structure with clones already placed, but we need to extract them
    # and ensure they're in the correct folders in the merged result
    def extract_and_place_clones(items: List[Dict[str, Any]], target_structure: List[Dict[str, Any]]) -> None:
        """Recursively extract clones from items and place them in correct folders."""
        for item in items:
            if "item" in item and isinstance(item["item"], list):
                # It's a folder - recurse into it
                extract_and_place_clones(item["item"], target_structure)
            elif "request" in item:
                # It's a request
                if is_clone(item):
                    # It's a clone - get parent folder name
                    parent_folder_name = item.get("parentFolderName")
                    
                    if parent_folder_name:
                        # Find the folder and add clone to it
                        folder = find_folder_by_name(target_structure, parent_folder_name)
                        if folder and "item" in folder:
                            # Check if clone already exists in this folder (avoid duplicates)
                            item_name = item.get("name", "")
                            item_method = item.get("request", {}).get("method", "")
                            clone_exists = any(
                                existing_item.get("name") == item_name and 
                                existing_item.get("request", {}).get("method") == item_method
                                for existing_item in folder["item"]
                            )
                            
                            if not clone_exists:
                                clean_clone = clean_item(item)
                                folder["item"].append(clean_clone)
                        else:
                            # Folder not found, add to root
                            clean_clone = clean_item(item)
                            target_structure.append(clean_clone)
                    else:
                        # No parent folder, add to root
                        clean_clone = clean_item(item)
                        target_structure.append(clean_clone)
    
    # Extract and place clones from updated_items structure to their respective folders
    extract_and_place_clones(updated_items, merged_result)
    
    return merged_result


@router.post("")
async def create_collection(request: UpdateCollectionRequest):
    """Create a new Postman collection manually."""
    collections_dir = Path(settings.postman_collections_dir)
    
    # Get the collection from request body
    collection = request.collection
    if not collection:
        raise HTTPException(status_code=400, detail="Collection data is required")
    
    # Validate that it's a valid Postman collection structure
    if "info" not in collection or "item" not in collection:
        raise HTTPException(status_code=400, detail="Invalid collection structure")
    
    # Extract collection name from info
    collection_name = collection.get("info", {}).get("name", "New Collection")
    sanitized_name = collection_name.lower().replace(" ", "-").replace("_", "-")
    # Remove special characters
    import re
    sanitized_name = re.sub(r'[^\w\s-]', '', sanitized_name)
    sanitized_name = re.sub(r'[-\s]+', '-', sanitized_name).strip('-')
    
    # Create collection directory
    collection_dir = collections_dir / sanitized_name
    collection_dir.mkdir(parents=True, exist_ok=True)
    
    # Save collection
    collection_file = collection_dir / f"{sanitized_name}.postman_collection.json"
    with open(collection_file, 'w', encoding='utf-8') as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)
    
    return {
        "message": "Collection created successfully",
        "collection_id": sanitized_name,
        "name": collection_name
    }


@router.post("/{collection_id}/clone")
async def clone_collection(collection_id: str):
    """Clone a Postman collection."""
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    # Sanitize collection_id to prevent path traversal
    collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
    if not collection_id:
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    
    collections_dir = Path(settings.postman_collections_dir)
    source_collection_dir = collections_dir / collection_id
    
    # Ensure path is within collections_dir (prevent path traversal)
    source_collection_dir = source_collection_dir.resolve()
    if not str(source_collection_dir).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not source_collection_dir.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    source_collection_file = source_collection_dir / f"{collection_id}.postman_collection.json"
    if not source_collection_file.exists():
        raise HTTPException(status_code=404, detail="Collection file not found")
    
    # Load source collection
    with open(source_collection_file, 'r', encoding='utf-8') as f:
        collection = json.load(f)
    
    # Generate new collection name
    import time
    timestamp = int(time.time())
    original_name = collection.get("info", {}).get("name", collection_id)
    new_name = f"{original_name} (Copy {timestamp})"
    sanitized_name = new_name.lower().replace(" ", "-").replace("_", "-")
    import re
    sanitized_name = re.sub(r'[^\w\s-]', '', sanitized_name)
    sanitized_name = re.sub(r'[-\s]+', '-', sanitized_name).strip('-')
    
    # Update collection info
    collection["info"]["name"] = new_name
    
    # Create new collection directory
    new_collection_dir = collections_dir / sanitized_name
    new_collection_dir.mkdir(parents=True, exist_ok=True)
    
    # Save cloned collection
    new_collection_file = new_collection_dir / f"{sanitized_name}.postman_collection.json"
    with open(new_collection_file, 'w', encoding='utf-8') as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)
    
    return {
        "message": "Collection cloned successfully",
        "collection_id": sanitized_name,
        "name": new_name
    }


@router.post("/{collection_id}/requests/{request_id}/clone")
async def clone_request(collection_id: str, request_id: str):
    """Clone a request within a collection."""
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    # Sanitize IDs to prevent path traversal
    collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
    request_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', request_id)
    if not collection_id or not request_id:
        raise HTTPException(status_code=400, detail="Invalid collection or request ID")
    
    collections_dir = Path(settings.postman_collections_dir)
    collection_file = collections_dir / collection_id / f"{collection_id}.postman_collection.json"
    
    # Ensure path is within collections_dir (prevent path traversal)
    collection_file = collection_file.resolve()
    if not str(collection_file).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not collection_file.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Load collection
    with open(collection_file, 'r', encoding='utf-8') as f:
        collection = json.load(f)
    
    # Find request to clone (recursive search)
    def find_and_clone_request(items, target_id):
        for item in items:
            if "item" in item and isinstance(item["item"], list):
                # It's a folder, recurse
                result = find_and_clone_request(item["item"], target_id)
                if result:
                    return result
            elif "request" in item:
                # Check if this is the request to clone (by name or id)
                if item.get("name") == target_id or item.get("_postman_id") == target_id:
                    # Clone the request
                    import time
                    timestamp = int(time.time())
                    cloned_request = json.loads(json.dumps(item))  # Deep copy
                    cloned_request["name"] = f"{item.get('name', 'Request')} (Copy {timestamp})"
                    # Remove _postman_id to generate new one
                    if "_postman_id" in cloned_request:
                        del cloned_request["_postman_id"]
                    return cloned_request
        return None
    
    cloned_request = find_and_clone_request(collection.get("item", []), request_id)
    
    if not cloned_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Add cloned request to the same location (or root if we can't determine parent)
    # For simplicity, add to root
    if "item" not in collection:
        collection["item"] = []
    collection["item"].append(cloned_request)
    
    # Save collection
    with open(collection_file, 'w', encoding='utf-8') as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)
    
    return {
        "message": "Request cloned successfully",
        "request_name": cloned_request.get("name")
    }


@router.put("/{collection_id}")
async def update_collection(collection_id: str, request: UpdateCollectionRequest):
    """Update a Postman collection - save the entire collection as-is (no merging)."""
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    # Sanitize collection_id to prevent path traversal
    collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
    if not collection_id:
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    
    collections_dir = Path(settings.postman_collections_dir)
    collection_file = collections_dir / collection_id / f"{collection_id}.postman_collection.json"
    
    # Ensure path is within collections_dir (prevent path traversal)
    collection_file = collection_file.resolve()
    if not str(collection_file).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not collection_file.exists():
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get the collection from request body
    collection = request.collection
    if not collection:
        raise HTTPException(status_code=400, detail="Collection data is required")
    
    # Validate that it's a valid Postman collection structure
    if "info" not in collection or "item" not in collection:
        raise HTTPException(status_code=400, detail="Invalid collection structure")
    
    # Save the collection directly as-is (no merging, no processing)
    with open(collection_file, 'w', encoding='utf-8') as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)
    
    return {
        "message": "Collection updated successfully",
        "collection_id": collection_id
    }


class FilterMapping(BaseModel):
    """Mapping from response attribute to request field."""
    responseAttribute: str
    requestField: str


class FilterCondition(BaseModel):
    """Filter condition for an attribute."""
    attribute: str
    condition: str  # EQ, NEQ, Contains, NotContains, GT, LT, GTE, LTE
    value: str


class GenerateFilteredCollectionRequest(BaseModel):
    """Request model for generating filtered collection."""
    collection_id: str
    request_name: str
    request_method: str
    response_body: Dict[str, Any]  # The response body to extract attributes from
    mappings: List[FilterMapping]  # Mappings from response to request
    filters: List[FilterCondition]  # Filter conditions
    collection_name: Optional[str] = None  # Optional custom name for new collection
    object_type: Optional[str] = None  # User-defined object type (e.g., "Portfolio")
    selected_conditions: Optional[Dict[str, List[str]]] = None  # {attributeName: [conditions]} - conditions selected per attribute
    generate_all_conditions: Optional[bool] = True  # If true, generate all conditions for each attribute
    request_body_mappings: Optional[Dict[str, Dict[str, Any]]] = None  # {requestField: {mode, source, value, enabled}}
    custom_attributes: Optional[Dict[str, Dict[str, Any]]] = None  # {attributeName: {type, nullable, name}} - custom attributes added by user


def extract_flat_attributes(data: Any, prefix: str = "") -> Dict[str, Any]:
    """Extract flat attributes from JSON data (supports objects and arrays of objects)."""
    attributes = {}
    
    if isinstance(data, dict):
        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, (dict, list)):
                # Recursively extract nested structures
                nested = extract_flat_attributes(value, full_key)
                attributes.update(nested)
            else:
                # Leaf value - determine type
                if isinstance(value, bool):
                    attr_type = "boolean"
                elif isinstance(value, (int, float)):
                    attr_type = "number"
                elif isinstance(value, str):
                    attr_type = "string"
                else:
                    attr_type = "string"  # Default to string
                attributes[full_key] = {
                    "value": value,
                    "type": attr_type,
                    "path": full_key
                }
    elif isinstance(data, list) and len(data) > 0:
        # If it's an array, extract attributes from first object
        if isinstance(data[0], dict):
            return extract_flat_attributes(data[0], prefix)
        else:
            # Array of primitives
            if prefix:
                attributes[prefix] = {
                    "value": data[0] if len(data) > 0 else None,
                    "type": "string",
                    "path": prefix
                }
    
    return attributes


def extract_schema_metadata(data: Any) -> Dict[str, Any]:
    """
    Extract schema metadata from response body.
    Handles schema format where each attribute has metadata: {name, type, nullable, required, format}
    """
    attributes = {}
    
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, dict):
                # Check if this is a schema metadata structure
                if "type" in value or "name" in value:
                    # It's a schema metadata object
                    attr_info = {
                        "name": value.get("name", key),
                        "type": value.get("type", "string"),
                        "nullable": value.get("nullable", False),
                        "required": value.get("required", False),
                        "path": key
                    }
                    
                    # Add format if present
                    if "format" in value:
                        attr_info["format"] = value.get("format")
                    
                    # Add description if present
                    if "description" in value:
                        attr_info["description"] = value.get("description")
                    
                    # Add default if present
                    if "default" in value:
                        attr_info["default"] = value.get("default")
                    
                    # Add enum if present
                    if "enum" in value:
                        attr_info["enum"] = value.get("enum")
                    
                    attributes[key] = attr_info
                else:
                    # Nested object - recurse
                    nested = extract_schema_metadata(value)
                    for nested_key, nested_value in nested.items():
                        attributes[f"{key}.{nested_key}"] = nested_value
            else:
                # Primitive value - create metadata
                attr_type = "string"
                if isinstance(value, bool):
                    attr_type = "boolean"
                elif isinstance(value, (int, float)):
                    attr_type = "number"
                
                attributes[key] = {
                    "name": key,
                    "type": attr_type,
                    "nullable": False,
                    "required": False,
                    "path": key,
                    "value": value
                }
    
    return attributes


def get_conditions_for_type(data_type: str) -> List[str]:
    """Get available filter conditions for a given data type from master data."""
    import httpx
    from pathlib import Path
    import json
    
    # Try to load from master data file directly (faster than API call)
    master_data_file = Path("Backend/MasterData/filtering_conditions.json")
    
    try:
        if master_data_file.exists():
            with open(master_data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                conditions = data.get("conditions", [])
                
                # Filter by data type and enabled status
                filtered = [
                    c.get("key") for c in conditions 
                    if c.get("dataType", "").lower() == data_type.lower() 
                    and c.get("enabled", True)
                ]
                
                if filtered:
                    return filtered
    except (IOError, json.JSONDecodeError) as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error loading master data: {str(e)}, falling back to defaults")
    
    # Fallback to defaults if master data not available
    if data_type == "string":
        return ["EQ", "NEQ", "Contains", "NotContains"]
    elif data_type in ["integer", "number", "int32", "int64", "float", "double"]:
        return ["EQ", "NEQ", "GT", "LT", "GTE", "LTE"]
    elif data_type == "boolean":
        return ["EQ", "NEQ"]
    else:
        return ["EQ", "NEQ"]  # Default


def generate_request_from_attribute(
    original_request: Dict[str, Any],
    attribute_name: str,
    attribute_metadata: Dict[str, Any],
    condition: str,
    object_type: str,
    request_body_mappings: Optional[Dict[str, Dict[str, Any]]] = None,
    response_attributes: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a single request for an attribute-condition combination.
    Maps values to request body using user-defined mappings or default hardcoded fields.
    """
    import copy
    import uuid
    
    # Deep copy the original request
    cloned = copy.deepcopy(original_request)
    
    # Generate new request name
    condition_suffix = condition.replace(" ", "_")
    cloned["name"] = f"{original_request.get('name', 'Request')}_{attribute_name}_{condition_suffix}"
    
    # Remove _postman_id from request items (only collection level should have it)
    if "_postman_id" in cloned:
        del cloned["_postman_id"]
    
    # Clean up: Remove fields that shouldn't be in request items
    # Remove response array (it's for saved responses, not part of request structure)
    if "response" in cloned:
        del cloned["response"]
    
    # Remove item array if present (this would make it a folder, not a request)
    if "item" in cloned:
        del cloned["item"]
    
    # Ensure request object exists
    if "request" not in cloned:
        cloned["request"] = {}
    
    request_obj = cloned.get("request", {})
    method = request_obj.get("method", "").upper()
    
    # Ensure URL object exists and is properly structured
    if "url" not in request_obj:
        request_obj["url"] = {
            "raw": "",
            "host": [],
            "path": [],
            "query": []
        }
    
    url = request_obj.get("url", {})
    
    # Ensure URL has required fields
    if "raw" not in url:
        # Reconstruct raw URL from components
        host_parts = url.get("host", [])
        path_parts = url.get("path", [])
        query_parts = url.get("query", [])
        
        raw_url = "/".join(host_parts) if host_parts else ""
        if path_parts:
            raw_url += "/" + "/".join(path_parts) if raw_url else "/".join(path_parts)
        if query_parts:
            query_string = "&".join([f"{q.get('key', '')}={q.get('value', '')}" for q in query_parts if q.get('key')])
            raw_url += "?" + query_string if query_string else ""
        
        url["raw"] = raw_url if raw_url else "{{baseUrl}}"
    
    # Ensure URL has array fields
    if "host" not in url or not isinstance(url.get("host"), list):
        url["host"] = url.get("host", []) if isinstance(url.get("host"), list) else []
    if "path" not in url or not isinstance(url.get("path"), list):
        url["path"] = url.get("path", []) if isinstance(url.get("path"), list) else []
    if "query" not in url or not isinstance(url.get("query"), list):
        url["query"] = url.get("query", []) if isinstance(url.get("query"), list) else []
    
    # Get data type from metadata
    data_type = attribute_metadata.get("type", "string")
    
    # Create request body with mapped values
    # Use user-defined mappings if provided, otherwise use default hardcoded fields
    request_body_data = {}
    
    if request_body_mappings:
        # Use user-defined mappings
        for request_field, mapping in request_body_mappings.items():
            if not mapping.get("enabled", True):
                continue  # Skip disabled mappings
            
            mode = mapping.get("mode", "none")
            source = mapping.get("source", "")
            value = mapping.get("value", "")
            
            if mode == "response" and source and response_attributes:
                # Map from response attribute
                attr_data = response_attributes.get(source, {})
                # Try to get value from different possible locations
                mapped_value = attr_data.get("value")
                if mapped_value is None:
                    # If no value in metadata, try to get from default
                    mapped_value = attr_data.get("default", "")
                # If still None, use empty string
                if mapped_value is None:
                    mapped_value = ""
                request_body_data[request_field] = mapped_value
            elif mode == "manual":
                # Use manual value
                request_body_data[request_field] = value
            elif mode == "special":
                # Use special system values
                if source == "attributeName":
                    request_body_data[request_field] = attribute_name
                elif source == "objectType":
                    request_body_data[request_field] = object_type or "Object"
                elif source == "dataType":
                    request_body_data[request_field] = data_type
                elif source == "condition":
                    request_body_data[request_field] = condition
                elif source == "attributeValue":
                    request_body_data[request_field] = "{{attributeValue}}"
            # mode == "none" means don't map this field (will use original value from request)
    else:
        # Default hardcoded behavior (backward compatibility)
        request_body_data = {
            "attributeName": attribute_name,
            "objectType": object_type or "Object",
            "dataType": data_type,
            "condition": condition,
            "attributeValue": "{{attributeValue}}"
        }
    
    # Apply to request body (for POST/PUT/PATCH) or query params (for GET)
    if request_body_mappings:
        # Use user-defined mappings - merge with original request body
        if method in ["GET", "HEAD", "DELETE"]:
            # For GET requests, add/update query parameters
            for key, value in request_body_data.items():
                query_param = next((q for q in url["query"] if q.get("key") == key), None)
                if query_param:
                    query_param["value"] = str(value)
                else:
                    url["query"].append({
                        "key": key,
                        "value": str(value),
                        "type": "string"
                    })
        else:
            # For POST/PUT/PATCH, merge with original request body
            body = request_obj.get("body", {})
            if not body:
                body = {
                    "mode": "raw",
                    "raw": "{}",
                    "options": {
                        "raw": {
                            "language": "json"
                        }
                    }
                }
                request_obj["body"] = body
            
            # Parse existing body if it exists
            existing_body = {}
            if body.get("raw"):
                try:
                    existing_body = json.loads(body.get("raw", "{}"))
                except (json.JSONDecodeError, TypeError):
                    existing_body = {}
            
            # Merge mapped values with existing body (only update mapped fields)
            merged_body = {**existing_body}
            for key, value in request_body_data.items():
                # Handle nested paths (e.g., "user.name")
                if "." in key:
                    parts = key.split(".")
                    current = merged_body
                    for part in parts[:-1]:
                        if part not in current:
                            current[part] = {}
                        elif not isinstance(current[part], dict):
                            current[part] = {}
                        current = current[part]
                    current[parts[-1]] = value
                else:
                    merged_body[key] = value
            
            body["raw"] = json.dumps(merged_body, indent=2)
    else:
        # Default behavior (backward compatibility)
        if method in ["GET", "HEAD", "DELETE"]:
            # For GET requests, add as query parameters
            for key, value in request_body_data.items():
                query_param = next((q for q in url["query"] if q.get("key") == key), None)
                if query_param:
                    query_param["value"] = str(value)
                else:
                    url["query"].append({
                        "key": key,
                        "value": str(value),
                        "type": "string"
                    })
        else:
            # For POST/PUT/PATCH, set request body
            body = request_obj.get("body", {})
            if not body:
                body = {
                    "mode": "raw",
                    "raw": "{}",
                    "options": {
                        "raw": {
                            "language": "json"
                        }
                    }
                }
                request_obj["body"] = body
            
            # Set the request body with mapped values
            body["raw"] = json.dumps(request_body_data, indent=2)
    
    # Ensure header array exists
    if "header" not in request_obj or not isinstance(request_obj.get("header"), list):
        request_obj["header"] = request_obj.get("header", []) if isinstance(request_obj.get("header"), list) else []
    
    return cloned


def apply_filter_condition(value: Any, condition: FilterCondition) -> bool:
    """Apply a filter condition to a value."""
    attr_value = str(value).lower() if isinstance(value, (str, int, float)) else str(value)
    filter_value = str(condition.value).lower()
    
    if condition.condition == "EQ":
        return attr_value == filter_value
    elif condition.condition == "NEQ":
        return attr_value != filter_value
    elif condition.condition == "Contains":
        return filter_value in attr_value
    elif condition.condition == "NotContains":
        return filter_value not in attr_value
    elif condition.condition == "GT":
        try:
            return float(value) > float(condition.value)
        except (ValueError, TypeError):
            return False
    elif condition.condition == "LT":
        try:
            return float(value) < float(condition.value)
        except (ValueError, TypeError):
            return False
    elif condition.condition == "GTE":
        try:
            return float(value) >= float(condition.value)
        except (ValueError, TypeError):
            return False
    elif condition.condition == "LTE":
        try:
            return float(value) <= float(condition.value)
        except (ValueError, TypeError):
            return False
    return False


def find_request_in_collection(items: List[Dict[str, Any]], target_name: str, target_method: str) -> Optional[Dict[str, Any]]:
    """Find a request in collection by name and method."""
    for item in items:
        if "item" in item and isinstance(item["item"], list):
            # It's a folder, recurse
            found = find_request_in_collection(item["item"], target_name, target_method)
            if found:
                return found
        elif "request" in item:
            if item.get("name") == target_name and item.get("request", {}).get("method", "").upper() == target_method.upper():
                return item
    return None


def find_request_and_parent(items: List[Dict[str, Any]], target_name: str, target_method: str, parent_items: Optional[List[Dict[str, Any]]] = None) -> tuple:
    """
    Find a request in collection by name and method, and return both the request and its parent items list.
    
    Returns:
        tuple: (request_item, parent_items_list) or (None, None) if not found
        - request_item: The found request dictionary
        - parent_items_list: The list that contains the request (could be root items or a folder's items)
    """
    if parent_items is None:
        parent_items = items
    
    for item in items:
        if "item" in item and isinstance(item["item"], list):
            # It's a folder, recurse into it
            found_request, found_parent = find_request_and_parent(
                item["item"], 
                target_name, 
                target_method, 
                item["item"]  # Pass the folder's items as parent
            )
            if found_request:
                return found_request, found_parent
        elif "request" in item:
            if item.get("name") == target_name and item.get("request", {}).get("method", "").upper() == target_method.upper():
                return item, parent_items
    
    return None, None


def clone_request_with_filters(
    original_request: Dict[str, Any],
    condition: FilterCondition,
    mappings: List[FilterMapping],
    response_attributes: Dict[str, Any]
) -> Dict[str, Any]:
    """Clone a request and apply mappings and filter conditions."""
    import copy
    import uuid
    
    # Deep copy the request
    cloned = copy.deepcopy(original_request)
    
    # Generate new name
    condition_suffix = f"{condition.attribute}_{condition.condition}_{condition.value}".replace(" ", "_")
    cloned["name"] = f"{original_request.get('name', 'Request')}_{condition_suffix}"
    
    # Remove _postman_id from request items (only collection level should have it)
    if "_postman_id" in cloned:
        del cloned["_postman_id"]
    
    # Remove response array if present
    if "response" in cloned:
        del cloned["response"]
    
    request_obj = cloned.get("request", {})
    method = request_obj.get("method", "").upper()
    
    # Apply mappings
    for mapping in mappings:
        # Get value from response attributes
        source_value = response_attributes.get(mapping.responseAttribute, {}).get("value")
        if source_value is not None:
            # Apply to request field
            if method in ["GET", "HEAD", "DELETE"]:
                # Apply to query parameters
                url = request_obj.get("url", {})
                if "query" not in url:
                    url["query"] = []
                
                # Check if query param already exists
                query_param = next((q for q in url["query"] if q.get("key") == mapping.requestField), None)
                if query_param:
                    query_param["value"] = str(source_value)
                else:
                    url["query"].append({
                        "key": mapping.requestField,
                        "value": str(source_value),
                        "type": "string"
                    })
            else:
                # Apply to request body
                body = request_obj.get("body", {})
                if not body:
                    body = {
                        "mode": "raw",
                        "raw": "{}",
                        "options": {
                            "raw": {
                                "language": "json"
                            }
                        }
                    }
                    request_obj["body"] = body
                
                # Parse body JSON
                try:
                    body_data = json.loads(body.get("raw", "{}"))
                    # Set nested field if path contains dots
                    if "." in mapping.requestField:
                        parts = mapping.requestField.split(".")
                        current = body_data
                        for part in parts[:-1]:
                            if part not in current:
                                current[part] = {}
                            current = current[part]
                        current[parts[-1]] = source_value
                    else:
                        body_data[mapping.requestField] = source_value
                    body["raw"] = json.dumps(body_data, indent=2)
                except (json.JSONDecodeError, TypeError):
                    # If body is not JSON, create new JSON
                    body_data = {mapping.requestField: source_value}
                    body["raw"] = json.dumps(body_data, indent=2)
    
    # Apply filter condition
    if method in ["GET", "HEAD", "DELETE"]:
        # Add filter as query parameter
        url = request_obj.get("url", {})
        if "query" not in url:
            url["query"] = []
        
        # Add filter condition
        filter_key = condition.attribute
        if condition.condition == "EQ":
            filter_value = condition.value
        elif condition.condition == "NEQ":
            filter_key = f"{condition.attribute}!"
            filter_value = condition.value
        elif condition.condition == "Contains":
            filter_value = f"*{condition.value}*"
        elif condition.condition == "NotContains":
            filter_key = f"{condition.attribute}!"
            filter_value = f"*{condition.value}*"
        else:
            filter_value = condition.value
        
        # Check if filter param already exists
        filter_param = next((q for q in url["query"] if q.get("key") == filter_key), None)
        if filter_param:
            filter_param["value"] = filter_value
        else:
            url["query"].append({
                "key": filter_key,
                "value": filter_value,
                "type": "string"
            })
    else:
        # Add filter to request body
        body = request_obj.get("body", {})
        if not body:
            body = {
                "mode": "raw",
                "raw": "{}",
                "options": {
                    "raw": {
                        "language": "json"
                    }
                }
            }
            request_obj["body"] = body
        
        try:
            body_data = json.loads(body.get("raw", "{}"))
            body_data[condition.attribute] = condition.value
            body["raw"] = json.dumps(body_data, indent=2)
        except (json.JSONDecodeError, TypeError):
            body_data = {condition.attribute: condition.value}
            body["raw"] = json.dumps(body_data, indent=2)
    
    return cloned


@router.post("/extract-attributes")
async def extract_response_attributes(response_body: Dict[str, Any]):
    """Extract flat attributes from a response body."""
    # Try to extract as schema metadata first (for schema format)
    schema_attributes = extract_schema_metadata(response_body)
    
    # If schema metadata found, use it; otherwise use regular extraction
    if schema_attributes and any("type" in attr for attr in schema_attributes.values()):
        return {
            "attributes": schema_attributes,
            "count": len(schema_attributes),
            "format": "schema"
        }
    else:
        attributes = extract_flat_attributes(response_body)
        return {
            "attributes": attributes,
            "count": len(attributes),
            "format": "data"
        }


@router.post("/generate-filtered")
async def generate_filtered_collection(request: GenerateFilteredCollectionRequest):
    """Generate filtered requests and add them to a folder in the original collection."""
    import logging
    import re
    import uuid
    import copy
    from datetime import datetime
    logger = logging.getLogger(__name__)
    
    collections_dir = Path(settings.postman_collections_dir)
    source_collection_file = collections_dir / request.collection_id / f"{request.collection_id}.postman_collection.json"
    
    # Ensure path is within collections_dir (prevent path traversal)
    source_collection_file = source_collection_file.resolve()
    if not str(source_collection_file).startswith(str(collections_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid collection path")
    
    if not source_collection_file.exists():
        raise HTTPException(status_code=404, detail="Source collection not found")
    
    # Load source collection
    with open(source_collection_file, 'r', encoding='utf-8') as f:
        source_collection = json.load(f)
    
    # Find the original request and its parent folder
    original_request, parent_items = find_request_and_parent(
        source_collection.get("item", []),
        request.request_name,
        request.request_method
    )
    
    if not original_request:
        raise HTTPException(status_code=404, detail="Request not found in collection")
    
    # If parent_items is None, use root items as fallback
    if parent_items is None:
        parent_items = source_collection.get("item", [])
        logger.warning(f"Could not determine parent folder for request '{request.request_name}', using root items")
    
    # Extract attributes from response body (try schema metadata first)
    schema_attributes = extract_schema_metadata(request.response_body)
    
    # If no schema metadata found, try regular extraction
    if not schema_attributes or not any("type" in attr for attr in schema_attributes.values()):
        # Fallback to regular extraction and convert to schema format
        flat_attributes = extract_flat_attributes(request.response_body)
        schema_attributes = {}
        for key, attr_data in flat_attributes.items():
            schema_attributes[key] = {
                "name": key,
                "type": attr_data.get("type", "string"),
                "nullable": False,
                "required": False,
                "path": key
            }
    
    # Merge custom attributes with schema attributes (custom attributes override if same name)
    if request.custom_attributes:
        for attr_name, attr_data in request.custom_attributes.items():
            schema_attributes[attr_name] = {
                "name": attr_data.get("name", attr_name),
                "type": attr_data.get("type", "string"),
                "nullable": attr_data.get("nullable", False),
                "required": False,
                "path": attr_name
            }
    
    # Get object type (user-defined or default)
    object_type = request.object_type or "Object"
    
    # Generate all filtering requests
    generated_requests = []
    
    # Generate requests using iteration process
    if request.generate_all_conditions or (request.selected_conditions and len(request.selected_conditions) > 0):
        # Iterate through each attribute and generate requests for all conditions
        for attribute_name, attribute_metadata in schema_attributes.items():
            data_type = attribute_metadata.get("type", "string")
            
            # Get conditions for this attribute
            if request.selected_conditions and attribute_name in request.selected_conditions:
                # Use user-selected conditions (includes custom conditions)
                conditions = request.selected_conditions[attribute_name]
            else:
                # Generate all conditions for this data type
                conditions = get_conditions_for_type(data_type)
                # Add custom conditions for this attribute if any
                if request.custom_conditions and attribute_name in request.custom_conditions:
                    for custom_cond in request.custom_conditions[attribute_name]:
                        if custom_cond not in conditions:
                            conditions.append(custom_cond)
            
            # Generate one request per condition
            for condition in conditions:
                generated_request = generate_request_from_attribute(
                    original_request,
                    attribute_name,
                    attribute_metadata,
                    condition,
                    object_type,
                    request.request_body_mappings,
                    schema_attributes
                )
                generated_requests.append(generated_request)
    elif request.filters and len(request.filters) > 0:
        # Legacy mode: Generate filtered requests (one per filter condition)
        response_attributes = extract_flat_attributes(request.response_body)
        for filter_condition in request.filters:
            cloned_request = clone_request_with_filters(
                original_request,
                filter_condition,
                request.mappings,
                response_attributes
            )
            generated_requests.append(cloned_request)
    else:
        # Fallback: Generate single request with mappings applied
        response_attributes = extract_flat_attributes(request.response_body)
        
        cloned = copy.deepcopy(original_request)
        cloned["name"] = f"{original_request.get('name', 'Request')}_Mapped"
        
        # Remove _postman_id from request items (only collection level should have it)
        if "_postman_id" in cloned:
            del cloned["_postman_id"]
        
        # Remove response array if present
        if "response" in cloned:
            del cloned["response"]
        
        request_obj = cloned.get("request", {})
        method = request_obj.get("method", "").upper()
        
        # Apply mappings
        for mapping in request.mappings:
            source_value = response_attributes.get(mapping.responseAttribute, {}).get("value")
            if source_value is not None:
                if method in ["GET", "HEAD", "DELETE"]:
                    url = request_obj.get("url", {})
                    if "query" not in url:
                        url["query"] = []
                    query_param = next((q for q in url["query"] if q.get("key") == mapping.requestField), None)
                    if query_param:
                        query_param["value"] = str(source_value)
                    else:
                        url["query"].append({
                            "key": mapping.requestField,
                            "value": str(source_value),
                            "type": "string"
                        })
                else:
                    body = request_obj.get("body", {})
                    if not body:
                        body = {
                            "mode": "raw",
                            "raw": "{}",
                            "options": {
                                "raw": {
                                    "language": "json"
                                }
                            }
                        }
                        request_obj["body"] = body
                    
                    try:
                        body_data = json.loads(body.get("raw", "{}"))
                        if "." in mapping.requestField:
                            parts = mapping.requestField.split(".")
                            current = body_data
                            for part in parts[:-1]:
                                if part not in current:
                                    current[part] = {}
                                current = current[part]
                            current[parts[-1]] = source_value
                        else:
                            body_data[mapping.requestField] = source_value
                        body["raw"] = json.dumps(body_data, indent=2)
                    except (json.JSONDecodeError, TypeError):
                        body_data = {mapping.requestField: source_value}
                        body["raw"] = json.dumps(body_data, indent=2)
        
        generated_requests.append(cloned)
    
    # Calculate total requests generated
    if request.generate_all_conditions or (request.selected_conditions and len(request.selected_conditions) > 0):
        requests_count = 0
        for attribute_name, attribute_metadata in schema_attributes.items():
            data_type = attribute_metadata.get("type", "string")
            if request.selected_conditions and attribute_name in request.selected_conditions:
                conditions = request.selected_conditions[attribute_name]
            else:
                conditions = get_conditions_for_type(data_type)
            requests_count += len(conditions)
    elif request.filters and len(request.filters) > 0:
        requests_count = len(request.filters)
    else:
        requests_count = 1
    
    # Validate generated requests
    if not generated_requests:
        raise HTTPException(status_code=400, detail="No requests were generated")
    
    # Ensure all generated requests are valid and remove _postman_id from them
    for idx, item in enumerate(generated_requests):
        if not isinstance(item, dict):
            raise HTTPException(status_code=500, detail=f"Generated request at index {idx} is not a valid object")
        if "name" not in item:
            raise HTTPException(status_code=500, detail=f"Generated request at index {idx} is missing 'name' field")
        if "request" not in item:
            raise HTTPException(status_code=500, detail=f"Generated request at index {idx} is missing 'request' field")
        # Remove _postman_id from request items (only collection level should have it)
        if "_postman_id" in item:
            del item["_postman_id"]
    
    # Create folder name: "{RequestName} Filtering"
    folder_name = f"{request.request_name} Filtering"
    
    # Find if folder already exists in the parent items (where the request is located)
    existing_folder = None
    folder_index = None
    
    for idx, item in enumerate(parent_items):
        # Check if it's a folder with the same name
        if "item" in item and isinstance(item.get("item"), list) and item.get("name") == folder_name:
            existing_folder = item
            folder_index = idx
            break
    
    # Create or update the filtering folder
    if existing_folder:
        # Replace existing folder with new one (remove old, add new)
        parent_items.pop(folder_index)
        logger.info(f"Replacing existing folder '{folder_name}' in parent folder")
    
    # Create new folder with all generated requests
    filtering_folder = {
        "name": folder_name,
        "item": generated_requests
    }
    
    # Add folder to the parent items (same location as the original request)
    parent_items.append(filtering_folder)
    
    # Note: parent_items is a reference to the actual list in the collection structure,
    # so modifying it automatically updates the collection. No need to reassign.
    logger.info(f"Added '{folder_name}' folder to parent folder with {requests_count} requests")
    
    # Ensure collection has required structure
    if "info" not in source_collection:
        source_collection["info"] = {}
    
    # Ensure info has _postman_id (required for Postman import)
    if "_postman_id" not in source_collection.get("info", {}):
        source_collection["info"]["_postman_id"] = str(uuid.uuid4())
        logger.info(f"Added _postman_id to collection info for '{request.collection_id}'")
    
    # Ensure variable is a list
    if "variable" not in source_collection:
        source_collection["variable"] = []
    elif not isinstance(source_collection.get("variable"), list):
        source_collection["variable"] = []
    
    # Save updated collection back to file
    try:
        with open(source_collection_file, 'w', encoding='utf-8') as f:
            json.dump(source_collection, f, indent=2, ensure_ascii=False)
        
        # Verify the file was written correctly
        if not source_collection_file.exists() or source_collection_file.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="Failed to save collection file")
        
        logger.info(f"Added '{folder_name}' folder with {requests_count} requests to collection '{request.collection_id}'")
    except (IOError, OSError, json.JSONEncodeError) as e:
        logger.error(f"Error saving collection '{request.collection_id}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving collection: {str(e)}")
    
    collection_name = source_collection.get("info", {}).get("name", request.collection_id)
    
    return {
        "message": f"Filtering folder '{folder_name}' added successfully to collection",
        "collection_id": request.collection_id,
        "name": collection_name,
        "folder_name": folder_name,
        "requests_generated": requests_count,
        "file_path": str(source_collection_file)
    }


class MergeCollectionsRequest(BaseModel):
    """Request model for merging collections."""
    collection_ids: List[str]  # List of collection IDs to merge
    merged_collection_name: str  # Name for the merged collection


def is_injection_folder_name(folder_name: str) -> bool:
    """Check if a folder name indicates an injection folder."""
    if not folder_name:
        return False
    name_lower = folder_name.lower()
    return any(injection in name_lower for injection in [
        "xss-injection", "sql-injection", "html-injection",
        "xss-injections", "sql-injections", "html-injections"
    ])


def extract_requests_from_collection(items: List[Dict[str, Any]], collection_name: str = "", parent_folder_name: str = "") -> tuple:
    """
    Extract all requests from collection items recursively.
    Returns tuple: (requests_list, injection_folders_list)
    - requests_list: List of requests with metadata
    - injection_folders_list: List of injection folders with their requests
    """
    requests = []
    injection_folders = []
    
    for item in items:
        if "request" in item:
            # It's a request
            request_copy = json.loads(json.dumps(item))  # Deep copy
            # Add collection name to request metadata for duplicate handling
            if collection_name:
                request_copy["_source_collection"] = collection_name
            # Add parent folder name (this is the request name folder from conversion)
            if parent_folder_name:
                request_copy["_parent_folder"] = parent_folder_name
            requests.append(request_copy)
        elif "item" in item and isinstance(item["item"], list):
            # It's a folder
            folder_name = item.get("name", "")
            
            if is_injection_folder_name(folder_name):
                # This is an injection folder - extract its items
                injection_items = []
                for sub_item in item.get("item", []):
                    if "request" in sub_item:
                        # It's a request in the injection folder
                        req_copy = json.loads(json.dumps(sub_item))
                        if collection_name:
                            req_copy["_source_collection"] = collection_name
                        if parent_folder_name:
                            req_copy["_parent_folder"] = parent_folder_name
                        injection_items.append(req_copy)
                    elif "item" in sub_item:
                        # Nested folder - recurse
                        nested_reqs, nested_inj = extract_requests_from_collection(
                            [sub_item], collection_name, parent_folder_name
                        )
                        injection_items.extend(nested_reqs)
                        injection_folders.extend(nested_inj)
                
                # Store injection folder with its items
                injection_folders.append({
                    "name": folder_name,
                    "item": injection_items,
                    "_parent_folder": parent_folder_name,
                    "_source_collection": collection_name
                })
            else:
                # Regular folder (likely a request name folder from conversion)
                # Recurse into it, passing folder name as parent
                folder_reqs, folder_inj = extract_requests_from_collection(
                    item.get("item", []), collection_name, folder_name
                )
                requests.extend(folder_reqs)
                injection_folders.extend(folder_inj)
    
    return requests, injection_folders


def group_requests_by_name(requests: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group requests by their name (same as conversion flow).
    Uses parent folder name if available (request name folder from conversion).
    Returns dict: {request_name: [list of requests]}
    """
    grouped = {}
    
    for request in requests:
        request_name = request.get("name", "Unnamed Request")
        
        # Use parent folder name if available (this is the request name folder from conversion)
        # This matches the conversion flow where requests are grouped by name into folders
        parent_folder = request.get("_parent_folder")
        if parent_folder and not is_injection_folder_name(parent_folder):
            # Request was in a folder - use folder name as grouping key
            request_name = parent_folder
        
        if request_name not in grouped:
            grouped[request_name] = []
        grouped[request_name].append(request)
    
    return grouped


def handle_duplicate_requests(requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rename duplicate requests by adding collection name suffix.
    """
    seen = {}  # Track seen request names with method
    renamed = []
    
    for request in requests:
        request_name = request.get("name", "Unnamed Request")
        method = request.get("request", {}).get("method", "").upper()
        source_collection = request.get("_source_collection", "")
        
        # Create unique key: name + method
        key = f"{request_name}|{method}"
        
        if key in seen:
            # Duplicate found - rename it
            counter = seen[key].get("count", 1)
            seen[key]["count"] = counter + 1
            
            # Rename with collection name or number
            if source_collection:
                new_name = f"{request_name} ({source_collection})"
            else:
                new_name = f"{request_name} (Copy {counter})"
            
            request["name"] = new_name
            renamed.append(request)
        else:
            # First occurrence
            seen[key] = {"count": 1}
            renamed.append(request)
    
    return renamed


def build_folder_structure(grouped_requests: Dict[str, List[Dict[str, Any]]], injection_folders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Build folder structure for merged collection (same as conversion flow).
    Each request name becomes a folder containing:
    - Original requests (with duplicates renamed)
    - Injection folders if they exist (grouped by parent folder)
    """
    folders = []
    
    for request_name, requests in grouped_requests.items():
        folder_items = []
        
        # Handle duplicates
        renamed_requests = handle_duplicate_requests(requests)
        
        # Clean up metadata from requests and add to folder
        for req in renamed_requests:
            clean_req = {k: v for k, v in req.items() if not k.startswith("_")}
            folder_items.append(clean_req)
        
        # Group injection folders by parent folder (request name)
        request_injection_folders = {}
        for inj_folder in injection_folders:
            parent_folder = inj_folder.get("_parent_folder", "")
            if parent_folder == request_name:
                # This injection folder belongs to this request
                folder_name = inj_folder.get("name", "")
                if folder_name not in request_injection_folders:
                    request_injection_folders[folder_name] = []
                
                # Clean up metadata from injection items
                for item in inj_folder.get("item", []):
                    clean_item = {k: v for k, v in item.items() if not k.startswith("_")}
                    request_injection_folders[folder_name].append(clean_item)
        
        # Add injection folders to folder items
        for injection_folder_name, injection_items in request_injection_folders.items():
            if injection_items:
                folder_items.append({
                    "name": injection_folder_name,
                    "item": injection_items
                })
        
        # Create folder for this request name
        if folder_items:
            folders.append({
                "name": request_name,
                "item": folder_items
            })
    
    return folders


@router.post("/merge")
async def merge_collections(request: MergeCollectionsRequest):
    """
    Merge multiple collections into one.
    Groups requests by name (same as conversion flow) and handles duplicates.
    """
    import logging
    import re
    import uuid
    from datetime import datetime
    logger = logging.getLogger(__name__)
    
    if not request.collection_ids or len(request.collection_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 collections are required for merging")
    
    if not request.merged_collection_name or not request.merged_collection_name.strip():
        raise HTTPException(status_code=400, detail="Merged collection name is required")
    
    collections_dir = Path(settings.postman_collections_dir)
    all_requests = []
    all_injection_folders = []
    collection_info = None
    
    # Load all collections
    for collection_id in request.collection_ids:
        # Sanitize collection_id
        collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
        if not collection_id:
            continue
        
        collection_file = collections_dir / collection_id / f"{collection_id}.postman_collection.json"
        
        # Ensure path is within collections_dir
        collection_file = collection_file.resolve()
        if not str(collection_file).startswith(str(collections_dir.resolve())):
            logger.warning(f"Skipping invalid collection path: {collection_id}")
            continue
        
        if not collection_file.exists():
            logger.warning(f"Collection not found: {collection_id}")
            continue
        
        try:
            with open(collection_file, 'r', encoding='utf-8') as f:
                collection = json.load(f)
            
            # Get collection info from first collection
            if collection_info is None:
                collection_info = collection.get("info", {})
            
            # Extract collection name for duplicate handling
            collection_name = collection.get("info", {}).get("name", collection_id)
            
            # Extract all requests from this collection
            items = collection.get("item", [])
            extracted_requests, extracted_injections = extract_requests_from_collection(items, collection_name)
            all_requests.extend(extracted_requests)
            all_injection_folders.extend(extracted_injections)
            
        except Exception as e:
            logger.error(f"Error loading collection {collection_id}: {str(e)}")
            continue
    
    if not all_requests:
        raise HTTPException(status_code=400, detail="No requests found in selected collections")
    
    # Group requests by name (same as conversion flow)
    grouped = group_requests_by_name(all_requests)
    
    # Build folder structure
    folders = build_folder_structure(grouped, all_injection_folders)
    
    # Create merged collection
    sanitized_name = request.merged_collection_name.lower().replace(" ", "-").replace("_", "-")
    sanitized_name = re.sub(r'[^\w\s-]', '', sanitized_name)
    sanitized_name = re.sub(r'[-\s]+', '-', sanitized_name).strip('-')
    
    merged_collection = {
        "info": {
            "name": request.merged_collection_name,
            "description": f"Merged collection from {len(request.collection_ids)} collections",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            "_exporter_id": "swagger-to-postman-converter",
            "_postman_id": str(uuid.uuid4())
        },
        "item": folders,
        "variable": [],
        "auth": {}
    }
    
    # Merge variables from all collections (avoid duplicates)
    all_variables = {}
    for collection_id in request.collection_ids:
        collection_id = re.sub(r'[<>:"|?*\x00-\x1f/\\]', '', collection_id)
        collection_file = collections_dir / collection_id / f"{collection_id}.postman_collection.json"
        collection_file = collection_file.resolve()
        if str(collection_file).startswith(str(collections_dir.resolve())) and collection_file.exists():
            try:
                with open(collection_file, 'r', encoding='utf-8') as f:
                    collection = json.load(f)
                variables = collection.get("variable", [])
                for var in variables:
                    if isinstance(var, dict) and "key" in var:
                        var_key = var.get("key")
                        if var_key not in all_variables:
                            all_variables[var_key] = var
            except Exception:
                pass
    
    merged_collection["variable"] = list(all_variables.values())
    
    # Save merged collection
    collection_dir = collections_dir / sanitized_name
    collection_dir.mkdir(parents=True, exist_ok=True)
    
    collection_file = collection_dir / f"{sanitized_name}.postman_collection.json"
    with open(collection_file, 'w', encoding='utf-8') as f:
        json.dump(merged_collection, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Merged {len(request.collection_ids)} collections into '{sanitized_name}' with {len(folders)} folders")
    
    return {
        "message": "Collections merged successfully",
        "collection_id": sanitized_name,
        "name": request.merged_collection_name,
        "folders_count": len(folders),
        "source_collections": len(request.collection_ids),
        "file_path": str(collection_file)
    }