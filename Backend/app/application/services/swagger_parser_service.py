"""
Swagger parser service for parsing Swagger/OpenAPI files.
"""
import json
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class SwaggerParserService(ABC):
    """Abstract base class for Swagger parsers."""
    
    @abstractmethod
    async def parse(self, file_path: str) -> Dict[str, Any]:
        """Parse Swagger file and return structured data."""
        pass
    
    @abstractmethod
    def detect_version(self, swagger_data: Dict[str, Any]) -> Optional[str]:
        """Detect Swagger/OpenAPI version."""
        pass


class SwaggerParser:
    """Main Swagger parser that handles all versions."""
    
    @staticmethod
    async def parse_file(file_path: str) -> Dict[str, Any]:
        """
        Parse a Swagger/OpenAPI file.
        
        Args:
            file_path: Path to the Swagger file
            
        Returns:
            Dictionary containing parsed Swagger data
            
        Raises:
            ValueError: If file cannot be parsed as JSON or YAML
        """
        path = Path(file_path)
        
        # Check if file exists
        if not path.exists():
            raise FileNotFoundError(f"Swagger file not found: {file_path}")
        
        # Read file content
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError as e:
            raise ValueError(f"File '{file_path}' has encoding issues. Please ensure the file is UTF-8 encoded. Error: {str(e)}")
        except IOError as e:
            raise IOError(f"Error reading file '{file_path}': {str(e)}")
        
        # Check if content is empty
        if not content or not content.strip():
            raise ValueError(f"File '{file_path}' appears to be empty")
        
        # Try to parse as JSON first (if .json extension)
        # If that fails, try YAML
        swagger_data = None
        parse_error = None
        
        if path.suffix == '.json':
            # Try JSON first
            try:
                swagger_data = json.loads(content)
            except json.JSONDecodeError as e:
                # If JSON parsing fails, try YAML (file might be misnamed)
                try:
                    swagger_data = yaml.safe_load(content)
                except yaml.YAMLError as yaml_error:
                    raise ValueError(f"File '{file_path}' could not be parsed as JSON or YAML. JSON error: {str(e)}, YAML error: {str(yaml_error)}")
        else:
            # Try YAML first
            try:
                swagger_data = yaml.safe_load(content)
            except yaml.YAMLError as e:
                # If YAML parsing fails, try JSON (file might be misnamed)
                try:
                    swagger_data = json.loads(content)
                except json.JSONDecodeError as json_error:
                    raise ValueError(f"File '{file_path}' could not be parsed as YAML or JSON. YAML error: {str(e)}, JSON error: {str(json_error)}")
        
        if swagger_data is None:
            raise ValueError(f"File '{file_path}' appears to be empty or could not be parsed")
        
        # Detect version
        version = SwaggerParser._detect_version(swagger_data)
        swagger_data['_detected_version'] = version
        
        return swagger_data
    
    @staticmethod
    def _detect_version(swagger_data: Dict[str, Any]) -> str:
        """Detect Swagger/OpenAPI version."""
        if 'openapi' in swagger_data:
            version = swagger_data['openapi']
            if version.startswith('3.1'):
                return '3.1.x'
            elif version.startswith('3.0'):
                return '3.0.x'
            return version
        elif 'swagger' in swagger_data:
            version = swagger_data['swagger']
            if version.startswith('2.0'):
                return '2.0'
            return version
        return 'unknown'
    
    @staticmethod
    def extract_api_name(swagger_data: Dict[str, Any]) -> str:
        """Extract API name from Swagger data."""
        info = swagger_data.get('info', {})
        title = info.get('title', '')
        name = info.get('name', '')
        
        if title:
            return title
        elif name:
            return name
        else:
            return 'Unknown API'
    
    @staticmethod
    def sanitize_name(name: str) -> str:
        """Sanitize API name for file system."""
        import re
        # Remove special characters, replace spaces with hyphens
        sanitized = re.sub(r'[^\w\s-]', '', name)
        sanitized = re.sub(r'[-\s]+', '-', sanitized)
        return sanitized.strip('-').lower()
