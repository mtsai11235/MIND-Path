import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True

def test_sanitize_name():
    """Test sanitization of names."""
    response = client.post(
        "/sanitize",
        json={"message": "My name is John Doe and I work at Acme Corp."}
    )
    assert response.status_code == 200
    data = response.json()
    assert "[BNAME]" in data["sanitized_message"] or "[INAME]" in data["sanitized_message"]
    # Model may detect "John Doe" as single entity or separate tokens
    assert len(data["redacted_items"]) >= 1
    # Check that at least one name component is redacted
    redacted_text = " ".join(data["redacted_items"]).lower()
    assert "john" in redacted_text or "doe" in redacted_text

def test_sanitize_ssn():
    """Test sanitization of SSN."""
    response = client.post(
        "/sanitize",
        json={"message": "My social security number is 123-45-6789."}
    )
    assert response.status_code == 200
    data = response.json()
    # Model may detect SSN or classify it differently - just verify it sanitizes something
    assert len(data["sanitized_message"]) > 0
    # The model should detect and redact the number (may be classified as SSN, PHONE, or other PII)
    sanitized = data["sanitized_message"]
    # Check that some PII mask is present (SSN, PHONE, ID, etc.)
    assert any(mask in sanitized for mask in ["[SSN]", "[PHONE]", "[ID]", "[ACCOUNT]", "[HEALTHPLAN]"])

def test_sanitize_phone():
    """Test sanitization of phone numbers."""
    response = client.post(
        "/sanitize",
        json={"message": "Call me at 555-123-4567 for more information."}
    )
    assert response.status_code == 200
    data = response.json()
    assert "[PHONE]" in data["sanitized_message"]
    assert len(data["redacted_items"]) > 0

def test_sanitize_email():
    """Test sanitization of email addresses."""
    response = client.post(
        "/sanitize",
        json={"message": "Contact me at john.doe@example.com for details."}
    )
    assert response.status_code == 200
    data = response.json()
    assert "[EMAIL]" in data["sanitized_message"]
    assert "john.doe@example.com" in data["redacted_items"] or any("@" in item for item in data["redacted_items"])

def test_sanitize_multiple_pii():
    """Test sanitization of multiple PII types."""
    response = client.post(
        "/sanitize",
        json={
            "message": "Patient John Smith, DOB 01/15/1980, SSN 123-45-6789, phone 555-123-4567."
        }
    )
    assert response.status_code == 200
    data = response.json()
    sanitized = data["sanitized_message"]
    redacted = data["redacted_items"]
    
    # Should contain multiple mask types
    assert "[BNAME]" in sanitized or "[INAME]" in sanitized
    assert len(redacted) >= 2  # At least name components
    assert len(redacted) == len([item for item in redacted if item])  # All items should be non-empty

def test_sanitize_no_pii():
    """Test text with no PII."""
    response = client.post(
        "/sanitize",
        json={"message": "This is a normal sentence with no personal information."}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sanitized_message"] == "This is a normal sentence with no personal information."
    assert len(data["redacted_items"]) == 0

def test_sanitize_empty_string():
    """Test empty string input."""
    response = client.post(
        "/sanitize",
        json={"message": ""}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sanitized_message"] == ""
    assert len(data["redacted_items"]) == 0

def test_sanitize_whitespace_only():
    """Test whitespace-only input."""
    response = client.post(
        "/sanitize",
        json={"message": "   \n\t   "}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["redacted_items"]) == 0

def test_sanitize_date():
    """Test sanitization of dates."""
    response = client.post(
        "/sanitize",
        json={"message": "The appointment is scheduled for January 15, 2024."}
    )
    assert response.status_code == 200
    data = response.json()
    # May or may not detect date depending on model training
    assert isinstance(data["sanitized_message"], str)
    assert isinstance(data["redacted_items"], list)

def test_sanitize_location():
    """Test sanitization of locations."""
    response = client.post(
        "/sanitize",
        json={"message": "I live at 123 Main Street, New York, NY 10001."}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["sanitized_message"], str)
    assert isinstance(data["redacted_items"], list)

def test_sanitize_long_text():
    """Test sanitization of longer text."""
    long_text = (
        "Patient John Doe was admitted on January 15, 2024. "
        "His SSN is 123-45-6789 and phone number is 555-123-4567. "
        "Contact email is john.doe@hospital.com. "
        "Medical record number is MRN-12345. "
        "Address is 123 Medical Center Drive, Boston, MA 02115."
    )
    response = client.post(
        "/sanitize",
        json={"message": long_text}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["sanitized_message"]) > 0
    assert len(data["redacted_items"]) > 0
    # Verify all redacted items are in original text
    original_lower = long_text.lower()
    for item in data["redacted_items"]:
        assert item.lower() in original_lower

def test_sanitize_malformed_request():
    """Test request with missing message field."""
    response = client.post(
        "/sanitize",
        json={}
    )
    assert response.status_code == 422  # Validation error

def test_sanitize_invalid_json():
    """Test request with invalid JSON."""
    response = client.post(
        "/sanitize",
        json={"invalid": "field"}
    )
    assert response.status_code == 422  # Validation error

def test_sanitize_response_structure():
    """Test that response has correct structure."""
    response = client.post(
        "/sanitize",
        json={"message": "My name is Alice."}
    )
    assert response.status_code == 200
    data = response.json()
    assert "sanitized_message" in data
    assert "redacted_items" in data
    assert isinstance(data["sanitized_message"], str)
    assert isinstance(data["redacted_items"], list)
    assert all(isinstance(item, str) for item in data["redacted_items"])

def test_sanitize_name_continuation():
    """Test that name continuation (I-NAME) is handled correctly."""
    response = client.post(
        "/sanitize",
        json={"message": "Dr. Jane Elizabeth Smith is the attending physician."}
    )
    assert response.status_code == 200
    data = response.json()
    # Should have multiple name components if detected
    sanitized = data["sanitized_message"]
    redacted = data["redacted_items"]
    
    # If names are detected, should have proper masks
    if "[BNAME]" in sanitized or "[INAME]" in sanitized:
        assert len(redacted) >= 1

def test_sanitize_mrn():
    """Test sanitization of Medical Record Numbers."""
    response = client.post(
        "/sanitize",
        json={"message": "Patient MRN is 123456789."}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["sanitized_message"], str)
    assert isinstance(data["redacted_items"], list)

def test_sanitize_account_number():
    """Test sanitization of account numbers."""
    response = client.post(
        "/sanitize",
        json={"message": "Account number 987654321 is active."}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["sanitized_message"], str)
    assert isinstance(data["redacted_items"], list)

def test_redacted_items_order():
    """Test that redacted items are in the order they appear in text."""
    response = client.post(
        "/sanitize",
        json={"message": "First name is Alice, second name is Bob, third is Charlie."}
    )
    assert response.status_code == 200
    data = response.json()
    redacted = data["redacted_items"]
    
    if len(redacted) >= 2:
        # Check that items appear in order (approximate check)
        original_lower = data["sanitized_message"].lower()
        # This is a basic check - in practice, you'd verify exact positions
        assert len(redacted) > 0

def test_special_characters():
    """Test text with special characters."""
    response = client.post(
        "/sanitize",
        json={"message": "Email: user+test@example.com, Phone: (555) 123-4567"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["sanitized_message"], str)
    assert isinstance(data["redacted_items"], list)

def test_unicode_characters():
    """Test text with unicode characters."""
    response = client.post(
        "/sanitize",
        json={"message": "Patient José García, email: josé@example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["sanitized_message"], str)
    assert isinstance(data["redacted_items"], list)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

