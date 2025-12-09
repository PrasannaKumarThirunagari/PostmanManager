"""
Variable extractor service for replacing hardcoded values with variables.
"""
import re
from typing import Dict, Any, List, Set


class VariableExtractorService:
    """Service for extracting and replacing variables."""
    
    @staticmethod
    def extract_variables(data: Any, variables: Set[str] = None) -> Set[str]:
        """Recursively extract variable names from data."""
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
        """Replace base URL with variable."""
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
        """Replace a value with a variable based on field name."""
        # Generate variable name from field name
        var_name = VariableExtractorService._generate_variable_name(field_name)
        return f"{{{{{var_name}}}}}"
    
    @staticmethod
    def _generate_variable_name(field_name: str) -> str:
        """Generate a variable name from field name."""
        # Convert field_name to camelCase
        parts = re.split(r'[_\s-]+', field_name.lower())
        if len(parts) == 1:
            return parts[0]
        return parts[0] + ''.join(word.capitalize() for word in parts[1:])
