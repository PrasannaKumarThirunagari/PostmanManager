"""
Custom exception classes for the application.
Following the requirements from RulesAndStandards.md.
"""
from typing import Optional


class SwaggerParseError(Exception):
    """
    Raised when Swagger file parsing fails.
    
    Args:
        message: Error message describing what went wrong
        detail: Optional detailed error information
        file_path: Optional path to the file that caused the error
    """
    def __init__(self, message: str, detail: Optional[str] = None, file_path: Optional[str] = None):
        self.message = message
        self.detail = detail
        self.file_path = file_path
        super().__init__(self.message)
    
    def __str__(self) -> str:
        if self.detail:
            return f"{self.message}: {self.detail}"
        return self.message


class PostmanCollectionError(Exception):
    """
    Raised when Postman collection generation or operation fails.
    
    Args:
        message: Error message describing what went wrong
        detail: Optional detailed error information
        collection_id: Optional ID of the collection that caused the error
    """
    def __init__(self, message: str, detail: Optional[str] = None, collection_id: Optional[str] = None):
        self.message = message
        self.detail = detail
        self.collection_id = collection_id
        super().__init__(self.message)
    
    def __str__(self) -> str:
        if self.detail:
            return f"{self.message}: {self.detail}"
        return self.message


class ValidationError(Exception):
    """
    Raised when validation fails.
    
    Args:
        message: Error message describing the validation failure
        field: Optional field name that failed validation
        detail: Optional detailed error information
    """
    def __init__(self, message: str, field: Optional[str] = None, detail: Optional[str] = None):
        self.message = message
        self.field = field
        self.detail = detail
        super().__init__(self.message)
    
    def __str__(self) -> str:
        if self.field:
            return f"Validation error for field '{self.field}': {self.message}"
        if self.detail:
            return f"{self.message}: {self.detail}"
        return self.message


class FileOperationError(Exception):
    """
    Raised when file operations fail.
    
    Args:
        message: Error message describing what went wrong
        file_path: Optional path to the file that caused the error
        detail: Optional detailed error information
    """
    def __init__(self, message: str, file_path: Optional[str] = None, detail: Optional[str] = None):
        self.message = message
        self.file_path = file_path
        self.detail = detail
        super().__init__(self.message)
    
    def __str__(self) -> str:
        if self.file_path:
            return f"{self.message} (file: {self.file_path})"
        if self.detail:
            return f"{self.message}: {self.detail}"
        return self.message


class ConversionError(Exception):
    """
    Raised when Swagger to Postman conversion fails.
    
    Args:
        message: Error message describing what went wrong
        conversion_id: Optional ID of the conversion that failed
        detail: Optional detailed error information
    """
    def __init__(self, message: str, conversion_id: Optional[str] = None, detail: Optional[str] = None):
        self.message = message
        self.conversion_id = conversion_id
        self.detail = detail
        super().__init__(self.message)
    
    def __str__(self) -> str:
        if self.detail:
            return f"{self.message}: {self.detail}"
        return self.message

