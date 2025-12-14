"""
Swagger parser service for parsing Swagger/OpenAPI files.

This module provides async file operations and proper error handling
following the project's coding standards.
"""
import json
import yaml
import aiofiles
from pathlib import Path
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod
from app.exceptions import SwaggerParseError, FileOperationError


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
        Parse a Swagger/OpenAPI file asynchronously.
        
        This method uses async file I/O operations to avoid blocking the event loop.
        It supports both JSON and YAML formats and will attempt to parse the file
        in both formats if the primary format fails.
        
        Args:
            file_path: Path to the Swagger file (relative or absolute)
            
        Returns:
            Dictionary containing parsed Swagger data with '_detected_version' key added
            
        Raises:
            FileOperationError: If file cannot be read or doesn't exist
            SwaggerParseError: If file cannot be parsed as JSON or YAML
        """
        path = Path(file_path)
        
        # Check if file exists
        if not path.exists():
            raise FileOperationError(
                message="Swagger file not found",
                file_path=str(file_path),
                detail=f"The file at path '{file_path}' does not exist"
            )
        
        # Read file content asynchronously
        try:
            async with aiofiles.open(path, 'r', encoding='utf-8') as f:
                content = await f.read()
        except UnicodeDecodeError as e:
            raise FileOperationError(
                message="File encoding error",
                file_path=str(file_path),
                detail=f"File '{file_path}' has encoding issues. Please ensure the file is UTF-8 encoded. Error: {str(e)}"
            )
        except (IOError, OSError) as e:
            raise FileOperationError(
                message="Error reading file",
                file_path=str(file_path),
                detail=f"Failed to read file '{file_path}': {str(e)}"
            )
        
        # Check if content is empty
        if not content or not content.strip():
            raise SwaggerParseError(
                message="Empty file",
                file_path=str(file_path),
                detail=f"File '{file_path}' appears to be empty"
            )
        
        # Try to parse as JSON first (if .json extension)
        # If that fails, try YAML
        swagger_data: Optional[Dict[str, Any]] = None
        
        if path.suffix == '.json':
            # Try JSON first
            try:
                swagger_data = json.loads(content)
            except json.JSONDecodeError as e:
                # If JSON parsing fails, try YAML (file might be misnamed)
                try:
                    swagger_data = yaml.safe_load(content)
                except yaml.YAMLError as yaml_error:
                    raise SwaggerParseError(
                        message="Failed to parse file as JSON or YAML",
                        file_path=str(file_path),
                        detail=f"JSON error: {str(e)}, YAML error: {str(yaml_error)}"
                    )
        else:
            # Try YAML first
            try:
                swagger_data = yaml.safe_load(content)
            except yaml.YAMLError as e:
                # If YAML parsing fails, try JSON (file might be misnamed)
                try:
                    swagger_data = json.loads(content)
                except json.JSONDecodeError as json_error:
                    raise SwaggerParseError(
                        message="Failed to parse file as YAML or JSON",
                        file_path=str(file_path),
                        detail=f"YAML error: {str(e)}, JSON error: {str(json_error)}"
                    )
        
        if swagger_data is None:
            raise SwaggerParseError(
                message="File could not be parsed",
                file_path=str(file_path),
                detail="File appears to be empty or could not be parsed as JSON or YAML"
            )
        
        # Detect version
        version = SwaggerParser._detect_version(swagger_data)
        swagger_data['_detected_version'] = version
        
        return swagger_data
    
    @staticmethod
    def _detect_version(swagger_data: Dict[str, Any]) -> str:
        """
        Detect Swagger/OpenAPI version from parsed data.
        
        Args:
            swagger_data: Parsed Swagger/OpenAPI data dictionary
            
        Returns:
            Version string (e.g., '3.1.x', '3.0.x', '2.0', or 'unknown')
        """
        if 'openapi' in swagger_data:
            version = str(swagger_data['openapi'])
            if version.startswith('3.1'):
                return '3.1.x'
            elif version.startswith('3.0'):
                return '3.0.x'
            return version
        elif 'swagger' in swagger_data:
            version = str(swagger_data['swagger'])
            if version.startswith('2.0'):
                return '2.0'
            return version
        return 'unknown'
    
    @staticmethod
    def extract_api_name(swagger_data: Dict[str, Any]) -> str:
        """
        Extract API name from Swagger data.
        
        Tries to extract the name from 'info.title' first, then 'info.name',
        and falls back to 'Unknown API' if neither is available.
        
        Args:
            swagger_data: Parsed Swagger/OpenAPI data dictionary
            
        Returns:
            API name string
        """
        info = swagger_data.get('info', {})
        title = info.get('title', '')
        name = info.get('name', '')
        
        if title:
            return str(title)
        elif name:
            return str(name)
        else:
            return 'Unknown API'
    
    @staticmethod
    def sanitize_name(name: str) -> str:
        """
        Sanitize API name for file system compatibility.
        
        Removes special characters, replaces spaces with hyphens, and converts
        to lowercase to ensure the name is safe for use in file paths.
        
        Args:
            name: Original API name
            
        Returns:
            Sanitized name safe for file system use
        """
        import re
        # Remove special characters, replace spaces with hyphens
        sanitized = re.sub(r'[^\w\s-]', '', name)
        sanitized = re.sub(r'[-\s]+', '-', sanitized)
        return sanitized.strip('-').lower()
