"""
Variable extractor service for replacing hardcoded values with variables.

This service provides functionality to extract Postman variable references
from data structures and replace hardcoded values with variable syntax.
"""
import re
from typing import Dict, Any, List, Set, Optional


class VariableExtractorService:
    """
    Service for extracting and replacing variables in Postman collections.
    
    This service helps convert hardcoded values to Postman variable syntax
    ({{variablename}}) for better reusability across environments.
    """
    
    @staticmethod
    def extract_variables(data: Any, variables: Optional[Set[str]] = None) -> Set[str]:
        """
        Recursively extract variable names from data structures.
        
        Searches through dictionaries, lists, and strings to find all
        Postman variable references in the format {{variablename}}.
        
        Args:
            data: Data structure to search (dict, list, str, or other types)
            variables: Optional set to accumulate variables (used for recursion)
            
        Returns:
            Set of unique variable names found in the data structure
            
        Example:
            >>> data = {"url": "{{baseUrl}}/api", "token": "{{authToken}}"}
            >>> variables = VariableExtractorService.extract_variables(data)
            >>> print(variables)
            {'baseUrl', 'authToken'}
        """
        if variables is None:
            variables = set()
        
        if isinstance(data, dict):
            for key, value in data.items():
                VariableExtractorService.extract_variables(value, variables)
        elif isinstance(data, list):
            for item in data:
                VariableExtractorService.extract_variables(item, variables)
        elif isinstance(data, str):
            # Find all {{variablename}} patterns
            matches = re.findall(r'\{\{(\w+)\}\}', data)
            variables.update(matches)
        
        return variables
    
    @staticmethod
    def replace_url_with_variable(url: str, variable_name: str = "baseUrl") -> str:
        """
        Replace base URL with a Postman variable reference.
        
        Extracts the base URL (protocol + domain) and replaces it with
        a variable reference, keeping the path portion intact.
        
        Args:
            url: Full URL to process (e.g., "https://api.example.com/v1/users")
            variable_name: Name of the variable to use (default: "baseUrl")
            
        Returns:
            URL with base portion replaced by variable (e.g., "{{baseUrl}}/v1/users")
            
        Example:
            >>> url = "https://api.example.com/v1/users"
            >>> result = VariableExtractorService.replace_url_with_variable(url)
            >>> print(result)
            {{baseUrl}}/v1/users
        """
        # Extract base URL (protocol + domain + port if exists)
        match = re.match(r'(https?://[^/]+)', url)
        if match:
            base_url = match.group(1)
            # Replace base URL with variable, ensuring no double slashes
            path_part = url[len(base_url):]
            return f"{{{{{variable_name}}}}}{path_part}"
        return url
    
    @staticmethod
    def replace_value_with_variable(value: str, field_name: str) -> str:
        """
        Replace a value with a Postman variable based on field name.
        
        Generates a camelCase variable name from the field name and
        returns it in Postman variable syntax.
        
        Args:
            value: Original value (not used, but kept for API consistency)
            field_name: Name of the field (e.g., "user_id", "api_key")
            
        Returns:
            Variable reference in Postman syntax (e.g., "{{userId}}", "{{apiKey}}")
            
        Example:
            >>> result = VariableExtractorService.replace_value_with_variable("123", "user_id")
            >>> print(result)
            {{userId}}
        """
        # Generate variable name from field name
        var_name = VariableExtractorService._generate_variable_name(field_name)
        return f"{{{{{var_name}}}}}"
    
    @staticmethod
    def _generate_variable_name(field_name: str) -> str:
        """
        Generate a camelCase variable name from a field name.
        
        Converts field names with underscores, hyphens, or spaces into
        camelCase format suitable for Postman variables.
        
        Args:
            field_name: Original field name (e.g., "user_id", "api-key", "user name")
            
        Returns:
            camelCase variable name (e.g., "userId", "apiKey", "userName")
            
        Example:
            >>> VariableExtractorService._generate_variable_name("user_id")
            'userId'
            >>> VariableExtractorService._generate_variable_name("api-key")
            'apikey'
        """
        # Convert field_name to camelCase
        parts = re.split(r'[_\s-]+', field_name.lower())
        if len(parts) == 1:
            return parts[0]
        return parts[0] + ''.join(word.capitalize() for word in parts[1:])
