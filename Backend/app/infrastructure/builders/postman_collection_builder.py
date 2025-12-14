"""
Postman Collection Builder.

Builds Postman Collection v2.1 format from Swagger data using the Builder pattern.
This class provides a fluent interface for constructing Postman collections.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime


class PostmanCollectionBuilder:
    """
    Builder for Postman collections.
    
    Implements the Builder pattern to construct Postman Collection v2.1 format
    objects step by step. Provides a fluent interface for building collections.
    
    Example:
        >>> builder = PostmanCollectionBuilder()
        >>> collection = (builder
        ...     .set_info("My API", "API Description", "1.0.0")
        ...     .set_auth("bearer", {"token": "{{authToken}}"})
        ...     .add_request("Get Users", "GET", "{{baseUrl}}/users")
        ...     .build())
    """
    
    def __init__(self) -> None:
        """
        Initialize a new Postman collection builder.
        
        Creates an empty collection structure with default values.
        """
        self.collection: Dict[str, Any] = {
            "info": {
                "name": "",
                "description": "",
                "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
                "_exporter_id": "swagger-to-postman-converter"
            },
            "item": [],
            "auth": {},
            "variable": []
        }
    
    def set_info(self, name: str, description: str = "", version: str = "") -> 'PostmanCollectionBuilder':
        """
        Set collection information.
        
        Args:
            name: Collection name
            description: Collection description (optional)
            version: Collection version (optional)
            
        Returns:
            Self for method chaining
        """
        self.collection["info"]["name"] = name
        self.collection["info"]["description"] = description or ""
        if version:
            self.collection["info"]["version"] = version
        return self
    
    def set_auth(self, auth_type: str, auth_values: Dict[str, Any]) -> 'PostmanCollectionBuilder':
        """
        Set collection-level authentication.
        
        Args:
            auth_type: Authentication type ('apiKey', 'basic', 'bearer', 'jwt')
            auth_values: Dictionary containing authentication values
            
        Returns:
            Self for method chaining
        """
        if not auth_type or not auth_values:
            return self
        
        auth_config = {}
        
        if auth_type == 'apiKey':
            auth_config = {
                "type": "apikey",
                "apikey": [
                    {
                        "key": "value",
                        "value": auth_values.get('value', ''),
                        "type": "string"
                    },
                    {
                        "key": "key",
                        "value": auth_values.get('key', ''),
                        "type": "string"
                    },
                    {
                        "key": "in",
                        "value": auth_values.get('location', 'header'),
                        "type": "string"
                    }
                ]
            }
        elif auth_type == 'basic':
            auth_config = {
                "type": "basic",
                "basic": [
                    {
                        "key": "username",
                        "value": auth_values.get('username', ''),
                        "type": "string"
                    },
                    {
                        "key": "password",
                        "value": auth_values.get('password', ''),
                        "type": "string"
                    }
                ]
            }
        elif auth_type == 'bearer':
            auth_config = {
                "type": "bearer",
                "bearer": [
                    {
                        "key": "token",
                        "value": auth_values.get('token', ''),
                        "type": "string"
                    }
                ]
            }
        elif auth_type == 'jwt':
            auth_config = {
                "type": "bearer",
                "bearer": [
                    {
                        "key": "token",
                        "value": auth_values.get('token', ''),
                        "type": "string"
                    }
                ]
            }
        
        if auth_config:
            self.collection["auth"] = auth_config
        
        return self
    
    def get_auth_config(self, auth_type: str, auth_values: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Get authentication configuration for individual requests.
        
        Args:
            auth_type: Authentication type ('apiKey', 'basic', 'bearer', 'jwt')
            auth_values: Dictionary containing authentication values
            
        Returns:
            Authentication configuration dictionary or None if invalid
        """
        if not auth_type or not auth_values:
            return None
        
        if auth_type == 'apiKey':
            return {
                "type": "apikey",
                "apikey": [
                    {
                        "key": "value",
                        "value": auth_values.get('value', ''),
                        "type": "string"
                    },
                    {
                        "key": "key",
                        "value": auth_values.get('key', ''),
                        "type": "string"
                    },
                    {
                        "key": "in",
                        "value": auth_values.get('location', 'header'),
                        "type": "string"
                    }
                ]
            }
        elif auth_type == 'basic':
            return {
                "type": "basic",
                "basic": [
                    {
                        "key": "username",
                        "value": auth_values.get('username', ''),
                        "type": "string"
                    },
                    {
                        "key": "password",
                        "value": auth_values.get('password', ''),
                        "type": "string"
                    }
                ]
            }
        elif auth_type in ['bearer', 'jwt']:
            return {
                "type": "bearer",
                "bearer": [
                    {
                        "key": "token",
                        "value": auth_values.get('token', ''),
                        "type": "string"
                    }
                ]
            }
        
        return None
    
    def add_request(self, name: str, method: str, url: str, 
                   description: str = "", headers: Optional[List[Dict[str, Any]]] = None,
                   body: Optional[Dict[str, Any]] = None, params: Optional[List[Dict[str, Any]]] = None,
                   auth: Optional[Dict[str, Any]] = None, responses: Optional[List[Dict[str, Any]]] = None,
                   events: Optional[List[Dict[str, Any]]] = None) -> 'PostmanCollectionBuilder':
        """
        Add a request to the collection.
        
        Args:
            name: Request name
            method: HTTP method (GET, POST, etc.)
            url: Request URL (can include variables like {{baseUrl}})
            description: Request description (optional)
            headers: List of header dictionaries (optional)
            body: Request body dictionary (optional)
            params: List of query parameter dictionaries (optional)
            auth: Authentication configuration (optional)
            responses: List of response examples (optional)
            events: List of pre-request/test scripts (optional)
            
        Returns:
            Self for method chaining
        """
        request = {
            "name": name,
            "request": {
                "method": method.upper(),
                "header": headers or [],
                "url": {
                    "raw": url,
                    "host": self._parse_host(url),
                    "path": self._parse_path(url),
                    "query": params or []
                }
            },
            "response": responses or []
        }
        
        if description:
            request["request"]["description"] = description
        
        if body:
            request["request"]["body"] = body
        
        if auth:
            request["request"]["auth"] = auth
        
        if events:
            request["event"] = events
        
        self.collection["item"].append(request)
        return self
    
    def add_folder(self, name: str, items: Optional[List[Dict[str, Any]]] = None) -> 'PostmanCollectionBuilder':
        """
        Add a folder to the collection.
        
        Args:
            name: Folder name
            items: List of request or folder items (optional)
            
        Returns:
            Self for method chaining
        """
        folder = {
            "name": name,
            "item": items or []
        }
        self.collection["item"].append(folder)
        return self
    
    def add_variable(self, key: str, value: str, variable_type: str = "string") -> 'PostmanCollectionBuilder':
        """
        Add a collection-level variable.
        
        If the variable already exists, it will be updated with the new value.
        
        Args:
            key: Variable name
            value: Variable value
            variable_type: Variable type (default: "string")
            
        Returns:
            Self for method chaining
        """
        # Check if variable already exists
        for var in self.collection["variable"]:
            if var.get("key") == key:
                var["value"] = value
                var["type"] = variable_type
                return self
        
        # Add new variable
        self.collection["variable"].append({
            "key": key,
            "value": value,
            "type": variable_type
        })
        return self
    
    def set_base_url(self, base_url: str) -> 'PostmanCollectionBuilder':
        """
        Set the baseUrl collection variable.
        
        Extracts the domain portion from the URL and sets it as the baseUrl variable.
        If the URL already contains a variable reference, this method does nothing.
        
        Args:
            base_url: Base URL (e.g., "https://api.example.com")
            
        Returns:
            Self for method chaining
        """
        # Extract just the domain (protocol + host) from the base URL
        import re
        from urllib.parse import urlparse
        
        # If it's already a variable reference, don't set it
        if '{{' in base_url:
            # Extract the actual URL value from server
            return self
        
        # Parse the URL to get just the domain
        parsed = urlparse(base_url)
        if parsed.netloc:
            # Reconstruct just the protocol + domain
            domain_url = f"{parsed.scheme}://{parsed.netloc}"
            self.add_variable("baseUrl", domain_url, "string")
        else:
            # Fallback to the full URL
            self.add_variable("baseUrl", base_url, "string")
        
        return self
    
    def build(self) -> Dict[str, Any]:
        """
        Build and return the completed collection.
        
        Returns:
            Complete Postman Collection v2.1 format dictionary
        """
        return self.collection
    
    def _parse_host(self, url: str) -> List[str]:
        """
        Parse host from URL.
        
        Handles URLs with Postman variables (e.g., {{baseUrl}}).
        
        Args:
            url: URL string to parse
            
        Returns:
            List containing host portion of URL (empty list if parsing fails)
        """
        try:
            from urllib.parse import urlparse
            import re
            
            # Check if URL starts with a variable (e.g., {{baseUrl}})
            if url.startswith('{{') and '}}' in url:
                # Extract the variable name
                var_match = re.match(r'\{\{([^}]+)\}\}', url)
                if var_match:
                    var_name = var_match.group(1)
                    # If it's baseUrl or a similar variable, include it in host
                    if var_name == 'baseUrl' or 'url' in var_name.lower():
                        return [f"{{{{{var_name}}}}}"]
            
            # Handle Postman variables in URL (e.g., {{baseUrl}})
            # Replace variables with placeholder for parsing
            temp_url = url
            temp_url = re.sub(r'\{\{[^}]+\}\}', 'placeholder', temp_url)
            parsed = urlparse(temp_url)
            if parsed.netloc and parsed.netloc != 'placeholder':
                return [parsed.netloc]
            # If URL contains variables but not at start, return empty list
            if '{{' in url:
                return []
        except (ValueError, AttributeError, ImportError) as e:
            # Log error but return empty list
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Error parsing host from URL '{url}': {str(e)}")
        except Exception as e:
            # Log unexpected errors
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Unexpected error parsing host from URL '{url}': {str(e)}")
        return []
    
    def _parse_path(self, url: str) -> List[str]:
        """
        Parse path from URL.
        
        Handles URLs with Postman variables (e.g., {{baseUrl}}).
        
        Args:
            url: URL string to parse
            
        Returns:
            List of path segments (empty list if parsing fails)
        """
        try:
            from urllib.parse import urlparse
            # Handle Postman variables in URL (e.g., {{baseUrl}})
            temp_url = url
            import re
            temp_url = re.sub(r'\{\{[^}]+\}\}', 'placeholder', temp_url)
            parsed = urlparse(temp_url)
            if parsed.path:
                path = parsed.path.strip('/')
                if path:
                    # Filter out placeholder values
                    parts = [p for p in path.split('/') if p != 'placeholder']
                    return parts
        except (ValueError, AttributeError, ImportError) as e:
            # Log error but return empty list
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Error parsing path from URL '{url}': {str(e)}")
        except Exception as e:
            # Log unexpected errors
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Unexpected error parsing path from URL '{url}': {str(e)}")
        return []
