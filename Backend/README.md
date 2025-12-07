# PII Sanitization API

FastAPI server for sanitizing PII (Personally Identifiable Information) using a fine-tuned MobileBERT NER model.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure the model is in `./mobilebert-bert_phi_finetuned/` directory

## Running the Server

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Testing

Run tests with pytest:

```bash
pytest test_main.py -v
```

Or run all tests:

```bash
pytest
```

## API Endpoints

### POST `/sanitize`

Sanitizes text by replacing PII with appropriate masks.

**Request:**
```json
{
  "message": "My name is John Doe and my SSN is 123-45-6789"
}
```

**Response:**
```json
{
  "sanitized_message": "My name is [BNAME] [INAME] and my SSN is [SSN]",
  "redacted_items": ["John", "Doe", "123-45-6789"]
}
```

**Example curl request:**
```bash
curl -X POST "http://localhost:8000/sanitize" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Patient John Smith was admitted on January 15, 2024. Contact at john.smith@hospital.com or 555-123-4567."
  }'
```

**Example response:**
```json
{
  "sanitized_message": "Patient [BNAME] [INAME] was admitted on [DATE]. Contact at [EMAIL] or [PHONE].",
  "redacted_items": ["John", "Smith", "January 15, 2024", "john.smith@hospital.com", "555-123-4567"]
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

## PII Masks

The following masks are used:
- `[BNAME]` - Beginning of name
- `[INAME]` - Continuation of name
- `[SSN]` - Social Security Number
- `[PHONE]` - Phone number
- `[EMAIL]` - Email address
- `[DATE]` - Date
- `[LOCATION]` - Location
- `[ACCOUNT]` - Account number
- `[MRN]` - Medical Record Number
- `[ID]` - ID number
- `[LICENSE]` - License number
- `[IP]` - IP address
- `[URL]` - URL
- `[HEALTHPLAN]` - Health plan
- `[DEVICE]` - Device identifier
- `[VEHICLE]` - Vehicle identifier
- `[FAX]` - Fax number

