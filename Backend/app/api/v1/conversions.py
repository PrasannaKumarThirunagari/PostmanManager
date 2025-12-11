"""
Conversion endpoints for Swagger to Postman conversion.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Set
import json
import asyncio
from pathlib import Path
from datetime import datetime, date
from app.config import settings
from app.application.services.swagger_parser_service import SwaggerParser
from app.infrastructure.builders.postman_collection_builder import PostmanCollectionBuilder
from app.application.services.security_test_service import SecurityTestService
from app.application.services.variable_extractor_service import VariableExtractorService

# In-memory conversion tracking (in production, use a database)
conversion_store: Dict[str, Dict[str, Any]] = {}


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime and date objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)


def json_serialize(obj):
    """Recursively serialize objects to JSON-compatible format."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: json_serialize(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [json_serialize(item) for item in obj]
    return obj


def extract_nested_string_fields(data: Any, prefix: str = "", max_depth: int = 10, current_depth: int = 0) -> List[str]:
    """
    Extract all string field paths from nested JSON structure using dot notation.
    Returns list of field paths like: ['pageIndex', 'columnList.attributeName', 'columnList.attributeValue']
    
    Args:
        data: The JSON data (dict, list, or primitive)
        prefix: Current path prefix (for nested objects)
        max_depth: Maximum nesting depth to prevent infinite recursion
        current_depth: Current nesting depth
    
    Returns:
        List of field paths (strings)
    """
    if current_depth >= max_depth:
        return []
    
    string_fields = []
    
    if isinstance(data, dict):
        for key, value in data.items():
            full_path = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                # Nested object - recurse
                nested_fields = extract_nested_string_fields(value, full_path, max_depth, current_depth + 1)
                string_fields.extend(nested_fields)
            elif isinstance(value, list) and len(value) > 0:
                # Array - extract from first element if it's an object
                if isinstance(value[0], dict):
                    nested_fields = extract_nested_string_fields(value[0], full_path, max_depth, current_depth + 1)
                    string_fields.extend(nested_fields)
                elif SecurityTestService.is_string_field(value[0]):
                    # Array of strings - include the array field itself
                    string_fields.append(full_path)
            elif SecurityTestService.is_string_field(value):
                # String field - add to list
                string_fields.append(full_path)
    elif isinstance(data, list) and len(data) > 0:
        # If it's an array, extract from first object
        if isinstance(data[0], dict):
            return extract_nested_string_fields(data[0], prefix, max_depth, current_depth)
        elif SecurityTestService.is_string_field(data[0]):
            if prefix:
                string_fields.append(prefix)
    
    return string_fields


def set_nested_value(data: Dict[str, Any], path: str, value: Any) -> Dict[str, Any]:
    """
    Set a value in a nested dictionary using dot notation path.
    
    Args:
        data: The dictionary to modify
        path: Dot notation path (e.g., 'columnList.attributeName')
        value: Value to set
    
    Returns:
        Modified dictionary
    """
    if not path or not isinstance(data, dict):
        return data
    
    parts = path.split('.')
    current = data
    
    # Navigate to the parent of the target field
    for part in parts[:-1]:
        if part not in current:
            current[part] = {}
        elif not isinstance(current[part], dict):
            # If it's not a dict, replace it with a dict
            current[part] = {}
        current = current[part]
    
    # Set the final value
    current[parts[-1]] = value
    
    return data


def resolve_schema_reference(swagger_data: Dict[str, Any], ref: str) -> Dict[str, Any]:
    """Resolve $ref schema reference."""
    if not ref.startswith('#/components/schemas/'):
        return {}
    
    schema_name = ref.replace('#/components/schemas/', '')
    components = swagger_data.get('components', {})
    schemas = components.get('schemas', {})
    return schemas.get(schema_name, {})


def extract_schema_properties(schema: Dict[str, Any], swagger_data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
    """Extract schema properties with name, type, and nullable attributes instead of generating examples."""
    if not schema:
        return {}
    
    # Handle $ref
    if '$ref' in schema:
        schema = resolve_schema_reference(swagger_data, schema['$ref'])
    
    schema_type = schema.get('type', 'object')
    result = {}
    
    if schema_type == 'object':
        properties = schema.get('properties', {})
        required = schema.get('required', [])
        
        for prop_name, prop_schema in properties.items():
            if '$ref' in prop_schema:
                prop_schema = resolve_schema_reference(swagger_data, prop_schema['$ref'])
            
            prop_type = prop_schema.get('type', 'string')
            prop_format = prop_schema.get('format', '')
            nullable = prop_schema.get('nullable', False)
            is_required = prop_name in required
            
            # Build property metadata
            prop_info = {
                "name": prop_name,
                "type": prop_type,
                "nullable": nullable,
                "required": is_required
            }
            
            # Add format if present
            if prop_format:
                prop_info["format"] = prop_format
            
            # Add description if present
            if 'description' in prop_schema:
                prop_info["description"] = prop_schema.get('description')
            
            # Add default if present
            if 'default' in prop_schema:
                prop_info["default"] = prop_schema.get('default')
            
            # Add enum if present
            if 'enum' in prop_schema:
                prop_info["enum"] = prop_schema.get('enum')
            
            # Handle nested objects and arrays
            if prop_type == 'object':
                nested_props = extract_schema_properties(prop_schema, swagger_data, f"{prefix}.{prop_name}" if prefix else prop_name)
                prop_info["properties"] = nested_props
                result[prop_name] = prop_info
            elif prop_type == 'array':
                items = prop_schema.get('items', {})
                if items:
                    if '$ref' in items:
                        items = resolve_schema_reference(swagger_data, items['$ref'])
                    item_type = items.get('type', 'string')
                    prop_info["items"] = {
                        "type": item_type
                    }
                    if item_type == 'object':
                        nested_props = extract_schema_properties(items, swagger_data, f"{prefix}.{prop_name}[]" if prefix else f"{prop_name}[]")
                        prop_info["items"]["properties"] = nested_props
                result[prop_name] = prop_info
            else:
                result[prop_name] = prop_info
        
        return result
    
    elif schema_type == 'array':
        items = schema.get('items', {})
        if items:
            if '$ref' in items:
                items = resolve_schema_reference(swagger_data, items['$ref'])
            item_type = items.get('type', 'string')
            
            if item_type == 'object':
                # For array of objects, return array with one object containing properties
                nested_props = extract_schema_properties(items, swagger_data, f"{prefix}[]" if prefix else "[]")
                return [nested_props] if nested_props else []
            else:
                # For array of primitives, return array structure
                return {
                    "type": "array",
                    "items": {
                        "type": item_type,
                        "nullable": items.get('nullable', False)
                    }
                }
        else:
            return {
                "type": "array",
                "items": {
                    "type": "string",
                    "nullable": False
                }
            }
    
    else:
        # Primitive type
        nullable = schema.get('nullable', False)
        prop_info = {
            "type": schema_type,
            "nullable": nullable
        }
        if 'format' in schema:
            prop_info["format"] = schema.get('format')
        if 'description' in schema:
            prop_info["description"] = schema.get('description')
        if 'default' in schema:
            prop_info["default"] = schema.get('default')
        if 'enum' in schema:
            prop_info["enum"] = schema.get('enum')
        return prop_info


def generate_example_from_schema(schema: Dict[str, Any], swagger_data: Dict[str, Any]) -> Any:
    """Generate example data from schema."""
    if not schema:
        return {}
    
    # Handle $ref
    if '$ref' in schema:
        schema = resolve_schema_reference(swagger_data, schema['$ref'])
    
    schema_type = schema.get('type', 'object')
    
    if schema_type == 'object':
        properties = schema.get('properties', {})
        example = {}
        required = schema.get('required', [])
        
        for prop_name, prop_schema in properties.items():
            if '$ref' in prop_schema:
                prop_schema = resolve_schema_reference(swagger_data, prop_schema['$ref'])
            
            prop_type = prop_schema.get('type', 'string')
            prop_format = prop_schema.get('format', '')
            prop_example = prop_schema.get('example')
            prop_default = prop_schema.get('default')
            
            # Handle datetime/date formats
            if prop_format in ['date-time', 'datetime']:
                if prop_example is not None:
                    # Convert datetime to string if it's a datetime object
                    if isinstance(prop_example, (datetime, date)):
                        example[prop_name] = prop_example.isoformat()
                    else:
                        example[prop_name] = str(prop_example)
                elif prop_default is not None:
                    if isinstance(prop_default, (datetime, date)):
                        example[prop_name] = prop_default.isoformat()
                    else:
                        example[prop_name] = str(prop_default)
                else:
                    # Generate ISO format datetime string
                    example[prop_name] = datetime.now().isoformat()
            elif prop_format == 'date':
                if prop_example is not None:
                    if isinstance(prop_example, date):
                        example[prop_name] = prop_example.isoformat()
                    else:
                        example[prop_name] = str(prop_example)
                elif prop_default is not None:
                    if isinstance(prop_default, date):
                        example[prop_name] = prop_default.isoformat()
                    else:
                        example[prop_name] = str(prop_default)
                else:
                    example[prop_name] = date.today().isoformat()
            elif prop_example is not None:
                # Convert datetime objects in examples to strings
                if isinstance(prop_example, (datetime, date)):
                    example[prop_name] = prop_example.isoformat()
                else:
                    example[prop_name] = prop_example
            elif prop_default is not None:
                # Convert datetime objects in defaults to strings
                if isinstance(prop_default, (datetime, date)):
                    example[prop_name] = prop_default.isoformat()
                else:
                    example[prop_name] = prop_default
            elif prop_name in required or len(required) == 0:
                # Generate example based on type
                if prop_type == 'string':
                    example[prop_name] = f"{{{{{prop_name}}}}}"
                elif prop_type == 'integer':
                    example[prop_name] = 0
                elif prop_type == 'number':
                    example[prop_name] = 0.0
                elif prop_type == 'boolean':
                    example[prop_name] = True
                elif prop_type == 'array':
                    items = prop_schema.get('items', {})
                    if items:
                        item_example = generate_example_from_schema(items, swagger_data)
                        example[prop_name] = [item_example] if item_example else []
                    else:
                        example[prop_name] = []
                elif prop_type == 'object':
                    example[prop_name] = generate_example_from_schema(prop_schema, swagger_data)
                else:
                    example[prop_name] = f"{{{{{prop_name}}}}}"
        
        return example
    
    elif schema_type == 'array':
        items = schema.get('items', {})
        if items:
            item_example = generate_example_from_schema(items, swagger_data)
            return [item_example] if item_example else []
        return []
    
    elif schema_type == 'string':
        example = schema.get('example')
        if example is not None:
            return example
        enum_values = schema.get('enum', [])
        if enum_values:
            return enum_values[0]
        return "{{value}}"
    
    elif schema_type == 'integer':
        return schema.get('example', schema.get('default', 0))
    
    elif schema_type == 'number':
        return schema.get('example', schema.get('default', 0.0))
    
    elif schema_type == 'boolean':
        return schema.get('example', schema.get('default', True))
    
    return {}

router = APIRouter()


class ConversionRequest(BaseModel):
    """Conversion request model."""
    swagger_file_id: str
    include_xss: bool = False
    include_sql: bool = False
    include_html: bool = False
    authorization_type: str = ""  # Single authorization type from dropdown
    authorization_values: dict = {}  # Authorization values based on type
    environments: List[str] = []  # List of environments to generate (local, dev, qa, uat, prod)
    include_global_headers: bool = True  # Include global headers by default
    selected_global_headers: List[str] = []  # List of global header IDs to include


class ConversionResponse(BaseModel):
    """Conversion response model."""
    conversion_id: str
    status: str
    message: str


@router.post("/convert")
async def convert_swagger_to_postman(
    request: ConversionRequest,
    background_tasks: BackgroundTasks
):
    """
    Convert Swagger file to Postman collection.
    """
    conversion_id = f"conv_{request.swagger_file_id}_{int(datetime.now().timestamp())}"
    
    # Initialize conversion tracking
    conversion_store[conversion_id] = {
        "conversion_id": conversion_id,
        "swagger_file_id": request.swagger_file_id,
        "status": "in_progress",
        "message": "Conversion in progress",
        "created_at": datetime.now().isoformat(),
        "include_xss": request.include_xss,
        "include_sql": request.include_sql,
        "include_html": request.include_html,
        "authorization_type": request.authorization_type,
        "environments": request.environments,
        "include_global_headers": request.include_global_headers,
        "selected_global_headers": request.selected_global_headers
    }
    
    try:
        # Find Swagger file
        swagger_dir = Path(settings.swagger_files_dir)
        swagger_file_path = None
        
        for ext in [".json", ".yaml", ".yml"]:
            potential_path = swagger_dir / f"{request.swagger_file_id}{ext}"
            if potential_path.exists():
                swagger_file_path = str(potential_path)
                break
        
        if not swagger_file_path:
            conversion_store[conversion_id]["status"] = "failed"
            conversion_store[conversion_id]["message"] = "Swagger file not found"
            conversion_store[conversion_id]["error"] = "Swagger file not found"
            raise HTTPException(status_code=404, detail="Swagger file not found")
        
        # Parse Swagger file
        swagger_data = await SwaggerParser.parse_file(swagger_file_path)
        
        # Extract API name
        api_name = SwaggerParser.extract_api_name(swagger_data)
        sanitized_name = SwaggerParser.sanitize_name(api_name)
        
        # Create Postman collection builder
        builder = PostmanCollectionBuilder()
        
        # Set collection info
        info = swagger_data.get('info', {})
        description = info.get('description', '')
        version = info.get('version', '')
        builder.set_info(api_name, description, version)
        
        # Set authentication
        if request.authorization_type and request.authorization_values:
            builder.set_auth(request.authorization_type, request.authorization_values)
        
        # Process paths and convert to Postman requests
        paths = swagger_data.get('paths', {})
        servers = swagger_data.get('servers', [])
        server_url = servers[0].get('url', 'https://api.example.com') if servers else 'https://api.example.com'
        
        # Extract only the domain part (protocol + host) for baseUrl variable
        # The path part from server URL will be included in the path
        import re
        domain_match = re.match(r'(https?://[^/]+)', server_url)
        if domain_match:
            # Extract the domain (protocol + host) for the baseUrl variable
            domain_url = domain_match.group(1)
            # Set baseUrl variable in collection with the actual domain value
            builder.add_variable("baseUrl", domain_url, "string")
            
            # Replace domain with variable, keep any path from server URL
            server_path = server_url[len(domain_match.group(1)):]
            # Build base_url: {{baseUrl}} + server_path (if any)
            # server_path will be like "/v1" or "" if no path
            if server_path:
                # Remove leading slash from server_path since we'll add it when combining
                server_path = server_path.lstrip('/')
                base_url = f"{{{{baseUrl}}}}/{server_path}" if server_path else "{{baseUrl}}"
            else:
                base_url = "{{baseUrl}}"
        else:
            # Fallback: set baseUrl to the full server_url
            builder.add_variable("baseUrl", server_url, "string")
            base_url = "{{baseUrl}}"
        
        # Ensure base_url doesn't end with / (path will have leading /)
        base_url = base_url.rstrip('/')
        
        # Ensure base_url doesn't start with / (should be {{baseUrl}} not /{{baseUrl}})
        if base_url.startswith('/'):
            base_url = base_url.lstrip('/')
        
        for path, path_item in paths.items():
            for method, operation in path_item.items():
                if method.lower() not in ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']:
                    continue
                
                # Get operation details
                summary = operation.get('summary', '')
                description = operation.get('description', '')
                operation_id = operation.get('operationId', f"{method}_{path.replace('/', '_').strip('_')}")
                
                # Build URL - path should start with /, base_url should not end with /
                path_clean = path if path.startswith('/') else f"/{path}"
                full_url = f"{base_url}{path_clean}"
                
                # Process parameters
                headers = []
                query_params = []
                path_params = []
                
                # Add global headers if enabled and selected
                if request.include_global_headers:
                    try:
                        from app.api.v1.global_headers import global_headers_store
                        for header_id, header_data in global_headers_store.items():
                            # Check if this header is in the selected list (or if no selection, include all enabled)
                            if not request.selected_global_headers or header_id in request.selected_global_headers:
                                if header_data.get('enabled', True):
                                    # Check if header key already exists (from Swagger parameters)
                                    existing_header = next(
                                        (h for h in headers if h.get('key') == header_data.get('key')),
                                        None
                                    )
                                    if not existing_header:
                                        headers.append({
                                            "key": header_data.get('key', ''),
                                            "value": header_data.get('value', ''),
                                            "type": "string",
                                            "description": header_data.get('description', '')
                                        })
                    except Exception as e:
                        # If global headers can't be loaded, continue without them
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Could not load global headers: {e}")
                
                for param in operation.get('parameters', []):
                    param_name = param.get('name', '')
                    param_in = param.get('in', '')
                    param_value = param.get('schema', {}).get('default', '')
                    
                    if param_in == 'header':
                        # Check if this header already exists (from global headers)
                        existing_header = next(
                            (h for h in headers if h.get('key') == param_name),
                            None
                        )
                        if not existing_header:
                            headers.append({
                                "key": param_name,
                                "value": f"{{{{{param_name}}}}}" if param_value else "",
                                "type": "string"
                            })
                    elif param_in == 'query':
                        query_params.append({
                            "key": param_name,
                            "value": f"{{{{{param_name}}}}}" if param_value else "",
                            "type": "string"
                        })
                    elif param_in == 'path':
                        # Replace path parameters in URL
                        full_url = full_url.replace(f"{{{param_name}}}", f"{{{{{param_name}}}}}")
                
                # Process request body
                body = None
                request_body = operation.get('requestBody', {})
                if request_body:
                    content = request_body.get('content', {})
                    
                    # Try different content types
                    content_type = None
                    content_data = None
                    
                    for ct in ['application/json', 'application/xml', 'multipart/form-data', 'application/x-www-form-urlencoded']:
                        if ct in content:
                            content_type = ct
                            content_data = content[ct]
                            break
                    
                    if content_data:
                        # Get example or generate from schema
                        example = content_data.get('example')
                        schema = content_data.get('schema', {})
                        
                        # Resolve schema reference if needed
                        if '$ref' in schema:
                            schema = resolve_schema_reference(swagger_data, schema['$ref'])
                        
                        # Generate body data
                        body_data = None
                        
                        if example:
                            # Serialize datetime objects in examples
                            body_data = json_serialize(example)
                        elif schema:
                            body_data = generate_example_from_schema(schema, swagger_data)
                            # Serialize datetime objects in generated examples
                            body_data = json_serialize(body_data)
                        
                        if body_data is not None:
                            # Serialize datetime objects before JSON encoding
                            body_data = json_serialize(body_data)
                            if content_type == 'application/json':
                                body = {
                                    "mode": "raw",
                                    "raw": json.dumps(body_data, indent=2, cls=DateTimeEncoder),
                                    "options": {
                                        "raw": {
                                            "language": "json"
                                        }
                                    }
                                }
                            elif content_type in ['multipart/form-data', 'application/x-www-form-urlencoded']:
                                body = {
                                    "mode": "urlencoded",
                                    "urlencoded": []
                                }
                                if isinstance(body_data, dict):
                                    for key, value in body_data.items():
                                        body["urlencoded"].append({
                                            "key": key,
                                            "value": str(value),
                                            "type": "text"
                                        })
                            else:
                                body = {
                                    "mode": "raw",
                                    "raw": str(body_data),
                                    "options": {
                                        "raw": {
                                            "language": "text"
                                        }
                                    }
                                }
                
                # Process responses
                postman_responses = []
                responses = operation.get('responses', {})
                for status_code, response_def in responses.items():
                    # Handle status code - convert non-numeric to numeric
                    if status_code.isdigit():
                        code = int(status_code)
                        status_text = status_code
                    else:
                        # Map common non-numeric status codes
                        status_map = {
                            'default': (200, 'OK'),
                            '2XX': (200, 'OK'),
                            '3XX': (300, 'Multiple Choices'),
                            '4XX': (400, 'Bad Request'),
                            '5XX': (500, 'Internal Server Error')
                        }
                        code, status_text = status_map.get(status_code, (200, 'OK'))
                    
                    response_data = {
                        "name": f"{status_code} {response_def.get('description', 'Response')}",
                        "originalRequest": {
                            "method": method.upper(),
                            "header": headers,
                            "url": {
                                "raw": full_url,
                                "host": builder._parse_host(full_url),
                                "path": builder._parse_path(full_url),
                                "query": query_params
                            }
                        },
                        "status": status_text,
                        "code": code,
                        "header": [],
                        "body": ""
                    }
                    
                    # Add request body if exists
                    if body:
                        response_data["originalRequest"]["body"] = body
                    
                    # Process response content
                    content = response_def.get('content', {})
                    if content:
                        # Try to get JSON response
                        json_content = content.get('application/json', {})
                        if json_content:
                            # Get example or generate from schema
                            example = json_content.get('example')
                            schema = json_content.get('schema', {})
                            
                            # Resolve schema reference if needed
                            if '$ref' in schema:
                                schema = resolve_schema_reference(swagger_data, schema['$ref'])
                            
                            # Extract response body schema properties (not examples)
                            response_body = None
                            if example:
                                # If explicit example exists, use it
                                response_body = json_serialize(example)
                            elif schema:
                                # Extract schema properties with metadata (name, type, nullable)
                                response_body = extract_schema_properties(schema, swagger_data)
                            
                            if response_body is not None:
                                # Serialize response body
                                response_data["body"] = json.dumps(response_body, indent=2, cls=DateTimeEncoder)
                                response_data["header"].append({
                                    "key": "Content-Type",
                                    "value": "application/json",
                                    "type": "text"
                                })
                    
                    # Process response headers from Swagger
                    response_headers = response_def.get('headers', {})
                    for header_name, header_spec in response_headers.items():
                        header_schema = header_spec.get('schema', {})
                        header_value = header_spec.get('example', '')
                        if not header_value and header_schema:
                            header_type = header_schema.get('type', 'string')
                            if header_type == 'string':
                                header_value = f"{{{{{header_name}}}}}"
                            elif header_type == 'integer':
                                header_value = str(header_schema.get('default', '0'))
                            else:
                                header_value = str(header_schema.get('default', ''))
                        
                        response_data["header"].append({
                            "key": header_name,
                            "value": header_value,
                            "type": "text"
                        })
                    
                    postman_responses.append(response_data)
                
                # Create request name
                request_name = summary or operation_id or f"{method.upper()} {path}"
                
                # Get auth config for individual requests
                request_auth = None
                if request.authorization_type and request.authorization_values:
                    request_auth = builder.get_auth_config(request.authorization_type, request.authorization_values)
                
                # Get status codes from responses to determine which scripts to include
                response_status_codes = []
                for status_code, response_def in responses.items():
                    if status_code.isdigit():
                        response_status_codes.append(int(status_code))
                    else:
                        # Map non-numeric status codes
                        status_map = {
                            'default': 200,
                            '2XX': 200,
                            '3XX': 300,
                            '4XX': 400,
                            '5XX': 500
                        }
                        response_status_codes.append(status_map.get(status_code, 200))
                
                # Get scripts for all response status codes (merged, no duplicates)
                from app.api.v1.status_scripts import get_scripts_for_status_codes, status_scripts_store
                from app.api.v1.injection_responses import get_response_for_injection_type
                scripts_dict = get_scripts_for_status_codes(response_status_codes) if response_status_codes else {'prerequest': [], 'test': []}
                
                # Debug: Log if scripts are found (can be removed in production)
                import logging
                logger = logging.getLogger(__name__)
                if scripts_dict['prerequest'] or scripts_dict['test']:
                    logger.info(f"Found scripts for status codes {response_status_codes}: prerequest={len(scripts_dict['prerequest'])} lines, test={len(scripts_dict['test'])} lines")
                elif response_status_codes:
                    logger.debug(f"No scripts found for status codes {response_status_codes}. Total scripts in store: {len(status_scripts_store)}")
                
                # Generate security test variants if requested
                if request.include_xss or request.include_sql or request.include_html:
                    # Create folder for this request
                    folder_items = []
                    
                    # Add original request to folder (use actual request name)
                    original_request = {
                        "name": request_name,
                        "request": {
                            "method": method.upper(),
                            "header": headers,
                            "url": {
                                "raw": full_url,
                                "host": builder._parse_host(full_url),
                                "path": builder._parse_path(full_url),
                                "query": query_params
                            }
                        },
                        "response": postman_responses
                    }
                    if body:
                        original_request["request"]["body"] = body
                    if request_auth:
                        original_request["request"]["auth"] = request_auth
                    
                    # Add scripts to original request
                    if scripts_dict['prerequest'] or scripts_dict['test']:
                        original_request["event"] = []
                        if scripts_dict['prerequest']:
                            original_request["event"].append({
                                "listen": "prerequest",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": scripts_dict['prerequest']
                                }
                            })
                        if scripts_dict['test']:
                            original_request["event"].append({
                                "listen": "test",
                                "script": {
                                    "type": "text/javascript",
                                    "exec": scripts_dict['test']
                                }
                            })
                    
                    folder_items.append(original_request)
                    
                    # Generate XSS variants - one request per field (including nested fields)
                    if request.include_xss:
                        xss_folder = {
                            "name": "XSS-Injections",
                            "item": []
                        }
                        if body and body.get('mode') == 'raw' and body.get('raw'):
                            try:
                                body_data = json.loads(body.get('raw', '{}'))
                                if isinstance(body_data, dict):
                                    # Get all string fields including nested ones (with dot notation)
                                    string_fields = extract_nested_string_fields(body_data)
                                    
                                    # Generate one request per field (one payload per field)
                                    for field_path in string_fields:
                                        # Use first payload for each field
                                        payload = SecurityTestService.XSS_PAYLOADS[0] if SecurityTestService.XSS_PAYLOADS else "<script>alert('XSS')</script>"
                                        # Create a copy of body_data
                                        variant_body_data = json.loads(body.get('raw', '{}'))
                                        # Inject payload into the specific field (handles nested paths)
                                        variant_body_data = set_nested_value(variant_body_data, field_path, payload)
                                        
                                        # Serialize datetime objects
                                        variant_body_data = json_serialize(variant_body_data)
                                        # Get injection response configuration for XSS
                                        injection_response = get_response_for_injection_type('xss')
                                        
                                        # Create response array with injection response if configured
                                        variant_responses = list(postman_responses) if postman_responses else []
                                        if injection_response:
                                            # Add 400 response for injection
                                            injection_400_response = {
                                                "name": f"{injection_response['status_code']} {injection_response['message']}",
                                                "originalRequest": {
                                                    "method": method.upper(),
                                                    "header": headers,
                                                    "url": {
                                                        "raw": full_url,
                                                        "host": builder._parse_host(full_url),
                                                        "path": builder._parse_path(full_url),
                                                        "query": query_params
                                                    },
                                                    "body": {
                                                        "mode": "raw",
                                                        "raw": json.dumps(variant_body_data, indent=2, cls=DateTimeEncoder),
                                                        "options": {"raw": {"language": "json"}}
                                                    }
                                                },
                                                "status": str(injection_response['status_code']),
                                                "code": injection_response['status_code'],
                                                "header": [
                                                    {
                                                        "key": "Content-Type",
                                                        "value": "application/json",
                                                        "type": "text"
                                                    }
                                                ],
                                                "body": json.dumps({
                                                    "error": injection_response['message'],
                                                    "statusCode": injection_response['status_code']
                                                }, indent=2)
                                            }
                                            variant_responses.append(injection_400_response)
                                        
                                        # Use field_path for naming (handles nested fields like "columnList.attributeName")
                                        display_name = field_path.replace('.', '-')  # Replace dots with dashes for readability
                                        variant_request = {
                                            "name": f"{request_name} XSS-Injection {display_name}",
                                            "request": {
                                                "method": method.upper(),
                                                "header": headers,
                                                "url": {
                                                    "raw": full_url,
                                                    "host": builder._parse_host(full_url),
                                                    "path": builder._parse_path(full_url),
                                                    "query": query_params
                                                },
                                                "body": {
                                                    "mode": "raw",
                                                    "raw": json.dumps(variant_body_data, indent=2, cls=DateTimeEncoder),
                                                    "options": {"raw": {"language": "json"}}
                                                }
                                            },
                                            "response": variant_responses
                                        }
                                        if request_auth:
                                            variant_request["request"]["auth"] = request_auth
                                        
                                        # Add scripts to variant request - use 400 status code for injection requests
                                        injection_scripts_dict = get_scripts_for_status_codes([400])
                                        
                                        # Add test script to validate injection response message if configured
                                        test_scripts = list(injection_scripts_dict.get('test', []))
                                        if injection_response and injection_response.get('message'):
                                            # Escape message for JavaScript string (handle quotes and special characters)
                                            escaped_message = injection_response['message'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                                            # Add test to validate the injection response message
                                            message_validation_script = [
                                                f"pm.test(\"Response should contain injection error message: {escaped_message}\", function () {{",
                                                "    const responseBody = pm.response.json();",
                                                f"    pm.expect(responseBody.error || responseBody.message || JSON.stringify(responseBody)).to.include(\"{escaped_message}\");",
                                                "});"
                                            ]
                                            test_scripts.extend(message_validation_script)
                                        
                                        if injection_scripts_dict['prerequest'] or test_scripts:
                                            variant_request["event"] = []
                                            if injection_scripts_dict['prerequest']:
                                                variant_request["event"].append({
                                                    "listen": "prerequest",
                                                    "script": {
                                                        "type": "text/javascript",
                                                        "exec": injection_scripts_dict['prerequest']
                                                    }
                                                })
                                            if test_scripts:
                                                variant_request["event"].append({
                                                    "listen": "test",
                                                    "script": {
                                                        "type": "text/javascript",
                                                        "exec": test_scripts
                                                    }
                                                })
                                        
                                        xss_folder["item"].append(variant_request)
                            except (json.JSONDecodeError, TypeError):
                                pass
                        folder_items.append(xss_folder)
                    
                    # Generate SQL variants - one request per field (including nested fields)
                    if request.include_sql:
                        sql_folder = {
                            "name": "SQL-Injections",
                            "item": []
                        }
                        if body and body.get('mode') == 'raw' and body.get('raw'):
                            try:
                                body_data = json.loads(body.get('raw', '{}'))
                                if isinstance(body_data, dict):
                                    # Get all string fields including nested ones (with dot notation)
                                    string_fields = extract_nested_string_fields(body_data)
                                    
                                    # Generate one request per field (one payload per field)
                                    for field_path in string_fields:
                                        # Use first payload for each field
                                        payload = SecurityTestService.SQL_PAYLOADS[0] if SecurityTestService.SQL_PAYLOADS else "' OR '1'='1"
                                        # Create a copy of body_data
                                        variant_body_data = json.loads(body.get('raw', '{}'))
                                        # Inject payload into the specific field (handles nested paths)
                                        variant_body_data = set_nested_value(variant_body_data, field_path, payload)
                                        
                                        # Serialize datetime objects
                                        variant_body_data = json_serialize(variant_body_data)
                                        # Get injection response configuration for SQL
                                        injection_response = get_response_for_injection_type('sql')
                                        
                                        # Create response array with injection response if configured
                                        variant_responses = list(postman_responses) if postman_responses else []
                                        if injection_response:
                                            # Add 400 response for injection
                                            injection_400_response = {
                                                "name": f"{injection_response['status_code']} {injection_response['message']}",
                                                "originalRequest": {
                                                    "method": method.upper(),
                                                    "header": headers,
                                                    "url": {
                                                        "raw": full_url,
                                                        "host": builder._parse_host(full_url),
                                                        "path": builder._parse_path(full_url),
                                                        "query": query_params
                                                    },
                                                    "body": {
                                                        "mode": "raw",
                                                        "raw": json.dumps(variant_body_data, indent=2, cls=DateTimeEncoder),
                                                        "options": {"raw": {"language": "json"}}
                                                    }
                                                },
                                                "status": str(injection_response['status_code']),
                                                "code": injection_response['status_code'],
                                                "header": [
                                                    {
                                                        "key": "Content-Type",
                                                        "value": "application/json",
                                                        "type": "text"
                                                    }
                                                ],
                                                "body": json.dumps({
                                                    "error": injection_response['message'],
                                                    "statusCode": injection_response['status_code']
                                                }, indent=2)
                                            }
                                            variant_responses.append(injection_400_response)
                                        
                                        # Use field_path for naming (handles nested fields like "columnList.attributeName")
                                        display_name = field_path.replace('.', '-')  # Replace dots with dashes for readability
                                        variant_request = {
                                            "name": f"{request_name} SQL-Injection {display_name}",
                                            "request": {
                                                "method": method.upper(),
                                                "header": headers,
                                                "url": {
                                                    "raw": full_url,
                                                    "host": builder._parse_host(full_url),
                                                    "path": builder._parse_path(full_url),
                                                    "query": query_params
                                                },
                                                "body": {
                                                    "mode": "raw",
                                                    "raw": json.dumps(variant_body_data, indent=2, cls=DateTimeEncoder),
                                                    "options": {"raw": {"language": "json"}}
                                                }
                                            },
                                            "response": variant_responses
                                        }
                                        if request_auth:
                                            variant_request["request"]["auth"] = request_auth
                                        
                                        # Add scripts to variant request - use 400 status code for injection requests
                                        injection_scripts_dict = get_scripts_for_status_codes([400])
                                        
                                        # Add test script to validate injection response message if configured
                                        test_scripts = list(injection_scripts_dict.get('test', []))
                                        if injection_response and injection_response.get('message'):
                                            # Escape message for JavaScript string (handle quotes and special characters)
                                            escaped_message = injection_response['message'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                                            # Add test to validate the injection response message
                                            message_validation_script = [
                                                f"pm.test(\"Response should contain injection error message: {escaped_message}\", function () {{",
                                                "    const responseBody = pm.response.json();",
                                                f"    pm.expect(responseBody.error || responseBody.message || JSON.stringify(responseBody)).to.include(\"{escaped_message}\");",
                                                "});"
                                            ]
                                            test_scripts.extend(message_validation_script)
                                        
                                        if injection_scripts_dict['prerequest'] or test_scripts:
                                            variant_request["event"] = []
                                            if injection_scripts_dict['prerequest']:
                                                variant_request["event"].append({
                                                    "listen": "prerequest",
                                                    "script": {
                                                        "type": "text/javascript",
                                                        "exec": injection_scripts_dict['prerequest']
                                                    }
                                                })
                                            if test_scripts:
                                                variant_request["event"].append({
                                                    "listen": "test",
                                                    "script": {
                                                        "type": "text/javascript",
                                                        "exec": test_scripts
                                                    }
                                                })
                                        
                                        sql_folder["item"].append(variant_request)
                            except (json.JSONDecodeError, TypeError):
                                pass
                        folder_items.append(sql_folder)
                    
                    # Generate HTML variants - one request per field
                    # Generate HTML variants - one request per field (including nested fields)
                    if request.include_html:
                        html_folder = {
                            "name": "HTML-Injections",
                            "item": []
                        }
                        if body and body.get('mode') == 'raw' and body.get('raw'):
                            try:
                                body_data = json.loads(body.get('raw', '{}'))
                                if isinstance(body_data, dict):
                                    # Get all string fields including nested ones (with dot notation)
                                    string_fields = extract_nested_string_fields(body_data)
                                    
                                    # Generate one request per field (one payload per field)
                                    for field_path in string_fields:
                                        # Use first payload for each field
                                        payload = SecurityTestService.HTML_PAYLOADS[0] if SecurityTestService.HTML_PAYLOADS else "<h1>Test</h1>"
                                        # Create a copy of body_data
                                        variant_body_data = json.loads(body.get('raw', '{}'))
                                        # Inject payload into the specific field (handles nested paths)
                                        variant_body_data = set_nested_value(variant_body_data, field_path, payload)
                                        
                                        # Serialize datetime objects
                                        variant_body_data = json_serialize(variant_body_data)
                                        # Get injection response configuration for HTML
                                        injection_response = get_response_for_injection_type('html')
                                        
                                        # Create response array with injection response if configured
                                        variant_responses = list(postman_responses) if postman_responses else []
                                        if injection_response:
                                            # Add 400 response for injection
                                            injection_400_response = {
                                                "name": f"{injection_response['status_code']} {injection_response['message']}",
                                                "originalRequest": {
                                                    "method": method.upper(),
                                                    "header": headers,
                                                    "url": {
                                                        "raw": full_url,
                                                        "host": builder._parse_host(full_url),
                                                        "path": builder._parse_path(full_url),
                                                        "query": query_params
                                                    },
                                                    "body": {
                                                        "mode": "raw",
                                                        "raw": json.dumps(variant_body_data, indent=2, cls=DateTimeEncoder),
                                                        "options": {"raw": {"language": "json"}}
                                                    }
                                                },
                                                "status": str(injection_response['status_code']),
                                                "code": injection_response['status_code'],
                                                "header": [
                                                    {
                                                        "key": "Content-Type",
                                                        "value": "application/json",
                                                        "type": "text"
                                                    }
                                                ],
                                                "body": json.dumps({
                                                    "error": injection_response['message'],
                                                    "statusCode": injection_response['status_code']
                                                }, indent=2)
                                            }
                                            variant_responses.append(injection_400_response)
                                        
                                        # Use field_path for naming (handles nested fields like "columnList.attributeName")
                                        display_name = field_path.replace('.', '-')  # Replace dots with dashes for readability
                                        variant_request = {
                                            "name": f"{request_name} HTML-Injection {display_name}",
                                            "request": {
                                                "method": method.upper(),
                                                "header": headers,
                                                "url": {
                                                    "raw": full_url,
                                                    "host": builder._parse_host(full_url),
                                                    "path": builder._parse_path(full_url),
                                                    "query": query_params
                                                },
                                                "body": {
                                                    "mode": "raw",
                                                    "raw": json.dumps(variant_body_data, indent=2, cls=DateTimeEncoder),
                                                    "options": {"raw": {"language": "json"}}
                                                }
                                            },
                                            "response": variant_responses
                                        }
                                        if request_auth:
                                            variant_request["request"]["auth"] = request_auth
                                        
                                        # Add scripts to variant request - use 400 status code for injection requests
                                        injection_scripts_dict = get_scripts_for_status_codes([400])
                                        
                                        # Add test script to validate injection response message if configured
                                        test_scripts = list(injection_scripts_dict.get('test', []))
                                        if injection_response and injection_response.get('message'):
                                            # Escape message for JavaScript string (handle quotes and special characters)
                                            escaped_message = injection_response['message'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                                            # Add test to validate the injection response message
                                            message_validation_script = [
                                                f"pm.test(\"Response should contain injection error message: {escaped_message}\", function () {{",
                                                "    const responseBody = pm.response.json();",
                                                f"    pm.expect(responseBody.error || responseBody.message || JSON.stringify(responseBody)).to.include(\"{escaped_message}\");",
                                                "});"
                                            ]
                                            test_scripts.extend(message_validation_script)
                                        
                                        if injection_scripts_dict['prerequest'] or test_scripts:
                                            variant_request["event"] = []
                                            if injection_scripts_dict['prerequest']:
                                                variant_request["event"].append({
                                                    "listen": "prerequest",
                                                    "script": {
                                                        "type": "text/javascript",
                                                        "exec": injection_scripts_dict['prerequest']
                                                    }
                                                })
                                            if test_scripts:
                                                variant_request["event"].append({
                                                    "listen": "test",
                                                    "script": {
                                                        "type": "text/javascript",
                                                        "exec": test_scripts
                                                    }
                                                })
                                        
                                        html_folder["item"].append(variant_request)
                            except (json.JSONDecodeError, TypeError):
                                pass
                        folder_items.append(html_folder)
                    
                    # Add folder with all variants
                    builder.add_folder(request_name, folder_items)
                else:
                    # Build events array for scripts
                    events = []
                    if scripts_dict['prerequest']:
                        events.append({
                            "listen": "prerequest",
                            "script": {
                                "type": "text/javascript",
                                "exec": scripts_dict['prerequest']
                            }
                        })
                    if scripts_dict['test']:
                        events.append({
                            "listen": "test",
                            "script": {
                                "type": "text/javascript",
                                "exec": scripts_dict['test']
                            }
                        })
                    
                    # Add original request without variants
                    builder.add_request(
                        name=request_name,
                        method=method,
                        url=full_url,
                        description=description,
                        headers=headers,
                        body=body,
                        params=query_params,
                        auth=request_auth,
                        responses=postman_responses,
                        events=events if events else None
                    )
        
        # Build collection
        collection = builder.build()
        
        # Ensure baseUrl variable is set (safety check)
        if not collection.get("variable") or not any(v.get("key") == "baseUrl" for v in collection.get("variable", [])):
            # Fallback: add baseUrl if it wasn't set
            if not collection.get("variable"):
                collection["variable"] = []
            domain_match = re.match(r'(https?://[^/]+)', server_url)
            if domain_match:
                domain_url = domain_match.group(1)
            else:
                domain_url = server_url
            collection["variable"].append({
                "key": "baseUrl",
                "value": domain_url,
                "type": "string"
            })
        
        # Add _postman_id to collection info (required for Postman import)
        import uuid
        if "info" in collection and "_postman_id" not in collection["info"]:
            collection["info"]["_postman_id"] = str(uuid.uuid4())
        
        # Ensure collection-level auth is preserved (if set)
        if request.authorization_type and request.authorization_values:
            auth_config = builder.get_auth_config(request.authorization_type, request.authorization_values)
            if auth_config:
                collection["auth"] = auth_config
        
        # Remove _postman_id from individual request items (only collection level should have it)
        def clean_request_items(items):
            """Recursively remove _postman_id from request items."""
            for item in items:
                if "_postman_id" in item:
                    del item["_postman_id"]
                # If it's a folder, recurse into its items
                if "item" in item and isinstance(item["item"], list):
                    clean_request_items(item["item"])
        
        if "item" in collection:
            clean_request_items(collection["item"])
        
        # Append login collection items if available
        from app.api.v1.login_collection import get_login_collection_items
        login_items = get_login_collection_items()
        if login_items:
            # Create a Login folder with the login collection items
            # Use the items as-is (no modifications)
            login_folder = {
                "name": "Login",
                "item": login_items
            }
            # Insert at the beginning of the items array
            if "item" not in collection:
                collection["item"] = []
            collection["item"].insert(0, login_folder)
        
        # Save collection
        collections_dir = Path(settings.postman_collections_dir)
        collection_dir = collections_dir / sanitized_name
        collection_dir.mkdir(parents=True, exist_ok=True)
        
        collection_file = collection_dir / f"{sanitized_name}.postman_collection.json"
        # Serialize datetime objects in collection before saving
        collection = json_serialize(collection)
        with open(collection_file, 'w', encoding='utf-8') as f:
            json.dump(collection, f, indent=2, ensure_ascii=False, cls=DateTimeEncoder)
        
        # Extract all distinct dynamic variables from collection
        all_variables = VariableExtractorService.extract_variables(collection)
        
        # Generate environment files for selected environments
        # Pass both sanitized_name (for folder/file names) and api_name (for config matching)
        if request.environments:
            await generate_environment_files(
                sanitized_name,  # Used for folder/file names
                api_name,  # Original API name for config matching
                swagger_data, 
                base_url, 
                request.authorization_values,
                request.environments,
                all_variables
            )
        
        # Update conversion record with success
        conversion_store[conversion_id].update({
            "status": "completed",
            "message": "Conversion completed successfully",
            "collection_id": sanitized_name,
            "collection_path": str(collection_file),
            "completed_at": datetime.now().isoformat()
        })
        
        return {
            "conversion_id": conversion_id,
            "status": "completed",
            "message": "Conversion completed successfully",
            "collection_id": sanitized_name,
            "collection_path": str(collection_file)
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except (ValueError, FileNotFoundError, IOError, OSError) as e:
        # Update conversion record with failure
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Conversion failed for {request.swagger_file_id}: {str(e)}", exc_info=True)
        
        if conversion_id in conversion_store:
            conversion_store[conversion_id].update({
                "status": "failed",
                "message": f"Conversion failed: {str(e)}",
                "error": str(e),
                "failed_at": datetime.now().isoformat()
            })
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    except Exception as e:
        # Update conversion record with failure
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error during conversion for {request.swagger_file_id}: {str(e)}", exc_info=True)
        
        if conversion_id in conversion_store:
            conversion_store[conversion_id].update({
                "status": "failed",
                "message": f"Conversion failed: {str(e)}",
                "error": str(e),
                "failed_at": datetime.now().isoformat()
            })
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


async def generate_environment_files(
    sanitized_api_name: str,  # For folder/file names
    original_api_name: str,  # Original API name for config matching
    swagger_data: Dict[str, Any],
    base_url: str,
    auth_values: Dict[str, Any],
    selected_environments: List[str],
    all_variables: Set[str]
):
    """Generate environment files for selected environments."""
    environments_dir = Path(settings.environments_dir)
    env_dir = environments_dir / sanitized_api_name  # Use sanitized name for folder
    env_dir.mkdir(parents=True, exist_ok=True)
    
    # Extract base URL from servers
    servers = swagger_data.get('servers', [])
    original_base_url = servers[0].get('url', 'https://api.example.com') if servers else 'https://api.example.com'
    
    # Environment URL mapping
    env_url_map = {
        'local': 'http://localhost:8000',
        'dev': original_base_url.replace('api.example.com', 'dev-api.example.com') if 'api.example.com' in original_base_url else original_base_url.replace('https://', 'https://dev-'),
        'qa': original_base_url.replace('api.example.com', 'qa-api.example.com') if 'api.example.com' in original_base_url else original_base_url.replace('https://', 'https://qa-'),
        'uat': original_base_url.replace('api.example.com', 'uat-api.example.com') if 'api.example.com' in original_base_url else original_base_url.replace('https://', 'https://uat-'),
        'prod': original_base_url
    }
    
    # Environment display name mapping
    env_display_map = {
        'local': 'Local',
        'dev': 'Development',
        'qa': 'QA',
        'uat': 'UAT',
        'prod': 'Production'
    }
    
    # Generate environment file for each selected environment
    for env_name in selected_environments:
        env_url = env_url_map.get(env_name, original_base_url)
        env_display_name = env_display_map.get(env_name, env_name.capitalize())
        
        # Load default values from MasterData if available
        from app.api.v1.default_api_configs import get_default_values_for_variables
        
        # Get all default values for this API and environment
        # Use original_api_name for matching (handles both sanitized and original names)
        all_var_names = ['baseUrl'] + list(all_variables)
        default_values = get_default_values_for_variables(original_api_name, env_name, all_var_names)
        
        # Check if baseUrl is in default configs
        default_base_url = default_values.get('baseUrl')
        final_base_url = default_base_url if default_base_url else env_url
        
        # Start with baseUrl
        env_values = [
            {
                "key": "baseUrl",
                "value": final_base_url,
                "type": "default",
                "enabled": True
            }
        ]
        
        # Add auth values (use defaults if available)
        if auth_values:
            for key, value in auth_values.items():
                # Use default value if available, otherwise use provided value
                var_key = key
                var_value = default_values.get(var_key, str(value))
                env_values.append({
                    "key": var_key,
                    "value": var_value,
                    "type": "secret" if key in ['password', 'token'] else "default",
                    "enabled": True
                })
        
        # Add all distinct dynamic variables found in collection
        for var_name in sorted(all_variables):
            # Skip baseUrl as it's already added
            if var_name.lower() == 'baseurl':
                continue
            # Skip auth variables that are already added
            if var_name in [k for k in auth_values.keys()]:
                continue
            
            # Use default value from config if available, otherwise generate one
            if var_name in default_values:
                default_value = default_values[var_name]
            else:
                default_value = generate_default_value_for_variable(var_name)
            
            env_values.append({
                "key": var_name,
                "value": default_value,
                "type": "default",
                "enabled": True
            })
        
        # Postman Environment v1.0 format
        env_file = {
            "id": f"{sanitized_api_name}-{env_display_name}",
            "name": f"{original_api_name} - {env_display_name}",
            "values": env_values,
            "_postman_variable_scope": "environment",
            "_postman_exported_at": datetime.now().isoformat(),
            "_postman_exported_using": "Swagger to Postman Converter"
        }
        
        # File naming: APINAME-{Environment}.postman_environment.json
        env_file_path = env_dir / f"{sanitized_api_name}-{env_display_name}.postman_environment.json"
        # Serialize datetime objects before saving
        env_file = json_serialize(env_file)
        with open(env_file_path, 'w', encoding='utf-8') as f:
            json.dump(env_file, f, indent=2, ensure_ascii=False, cls=DateTimeEncoder)


def generate_default_value_for_variable(var_name: str) -> str:
    """Generate a default value for a variable based on its name."""
    var_lower = var_name.lower()
    
    # Common patterns
    if 'url' in var_lower or 'endpoint' in var_lower:
        return 'https://example.com'
    elif 'id' in var_lower:
        return '1'
    elif 'email' in var_lower:
        return 'user@example.com'
    elif 'token' in var_lower or 'key' in var_lower:
        return 'your-token-here'
    elif 'date' in var_lower:
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d')
    elif 'page' in var_lower or 'limit' in var_lower or 'size' in var_lower:
        return '10'
    else:
        return f'{{{{value}}}}'


@router.get("")
async def list_conversions():
    """List all conversions."""
    conversions_list = list(conversion_store.values())
    # Sort by created_at descending (most recent first)
    conversions_list.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"conversions": conversions_list}


@router.get("/{conversion_id}")
async def get_conversion_status(conversion_id: str):
    """Get conversion status."""
    if conversion_id not in conversion_store:
        raise HTTPException(status_code=404, detail="Conversion not found")
    
    return conversion_store[conversion_id]


@router.post("/{conversion_id}/cancel")
async def cancel_conversion(conversion_id: str):
    """Cancel a conversion (if it's still in progress)."""
    if conversion_id not in conversion_store:
        raise HTTPException(status_code=404, detail="Conversion not found")
    
    conversion = conversion_store[conversion_id]
    
    # Only cancel if status is pending or in_progress
    if conversion.get("status") in ["completed", "failed", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel conversion with status: {conversion.get('status')}"
        )
    
    # Update status to cancelled
    conversion["status"] = "cancelled"
    conversion["cancelled_at"] = datetime.now().isoformat()
    conversion["message"] = "Conversion cancelled by user"
    
    return {
        "conversion_id": conversion_id,
        "status": "cancelled",
        "message": "Conversion cancelled successfully"
    }
