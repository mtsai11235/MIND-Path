import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch
from typing import List, Dict

app = FastAPI(title="PII Sanitization API")

# Load model and tokenizer
dirname = os.path.dirname(__file__)
MODEL_PATH = os.path.join(dirname, "mobilebert-bert_phi_finetuned")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"Loading model from {MODEL_PATH}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
model.to(device)
model.eval()
print("Model loaded successfully!")

# Label mappings from config
LABEL_TO_MASK = {
    "B-ACCOUNT": "[ACCOUNT]",
    "I-ACCOUNT": "[ACCOUNT]",
    "B-DATE": "[DATE]",
    "I-DATE": "[DATE]",
    "B-DEVICE": "[DEVICE]",
    "I-DEVICE": "[DEVICE]",
    "B-EMAIL": "[EMAIL]",
    "I-EMAIL": "[EMAIL]",
    "B-FAX": "[FAX]",
    "I-FAX": "[FAX]",
    "B-HEALTHPLAN": "[HEALTHPLAN]",
    "I-HEALTHPLAN": "[HEALTHPLAN]",
    "B-ID": "[ID]",
    "I-ID": "[ID]",
    "B-IP": "[IP]",
    "I-IP": "[IP]",
    "B-LICENSE": "[LICENSE]",
    "I-LICENSE": "[LICENSE]",
    "B-LOCATION": "[LOCATION]",
    "I-LOCATION": "[LOCATION]",
    "B-MRN": "[MRN]",
    "I-MRN": "[MRN]",
    "B-NAME": "[BNAME]",
    "I-NAME": "[INAME]",
    "B-PHONE": "[PHONE]",
    "I-PHONE": "[PHONE]",
    "B-SSN": "[SSN]",
    "I-SSN": "[SSN]",
    "B-URL": "[URL]",
    "I-URL": "[URL]",
    "B-VEHICLE": "[VEHICLE]",
    "I-VEHICLE": "[VEHICLE]",
    "O": None
}

class SanitizeRequest(BaseModel):
    message: str

class SanitizeResponse(BaseModel):
    sanitized_message: str
    redacted_items: List[str]

def group_entities(tokens: List[str], labels: List[str], word_ids: List[int]) -> List[Dict]:
    """Group tokens into entities based on BIO tags."""
    entities = []
    current_entity = None
    
    for i, (token, label, word_id) in enumerate(zip(tokens, labels, word_ids)):
        if word_id is None:  # Special tokens like [CLS], [SEP]
            continue
            
        if label.startswith("B-"):
            # Start new entity
            if current_entity:
                entities.append(current_entity)
            entity_type = label[2:]  # Remove "B-" prefix
            current_entity = {
                "type": entity_type,
                "tokens": [token],
                "word_ids": [word_id],
                "start_idx": i
            }
        elif label.startswith("I-"):
            # Continue current entity
            if current_entity and label[2:] == current_entity["type"]:
                current_entity["tokens"].append(token)
                current_entity["word_ids"].append(word_id)
            else:
                # I- tag without matching B- tag, treat as new entity
                if current_entity:
                    entities.append(current_entity)
                entity_type = label[2:]
                current_entity = {
                    "type": entity_type,
                    "tokens": [token],
                    "word_ids": [word_id],
                    "start_idx": i
                }
        else:  # "O" tag
            if current_entity:
                entities.append(current_entity)
                current_entity = None
    
    if current_entity:
        entities.append(current_entity)
    
    return entities

@app.post("/sanitize", response_model=SanitizeResponse)
async def sanitize_text(request: SanitizeRequest):
    """
    Sanitize text by replacing PII with appropriate masks.
    Returns sanitized text and list of redacted items in order.
    """
    try:
        text = request.message
        
        # Tokenize input with offset mapping for accurate text replacement
        encoding = tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
            return_offsets_mapping=True
        )
        
        # Move to device
        input_ids = encoding["input_ids"].to(device)
        attention_mask = encoding["attention_mask"].to(device)
        offset_mapping = encoding["offset_mapping"][0].cpu().numpy()
        
        # Run inference
        with torch.no_grad():
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            predictions = torch.argmax(outputs.logits, dim=-1)
        
        # Get predictions for first (and only) sequence
        pred_labels = predictions[0].cpu().numpy()
        tokens = tokenizer.convert_ids_to_tokens(input_ids[0])
        word_ids = encoding.word_ids(batch_index=0)
        
        # Get label names - handle both string and int keys
        id2label = model.config.id2label
        labels = []
        for pred in pred_labels:
            pred_int = int(pred)
            # Try string key first, then int key
            if str(pred_int) in id2label:
                labels.append(id2label[str(pred_int)])
            elif pred_int in id2label:
                labels.append(id2label[pred_int])
            else:
                # Fallback to "O" if label not found
                labels.append("O")
        
        # Group tokens into entities
        entities = group_entities(tokens, labels, word_ids)
        
        # Collect redacted items and replacement spans
        redacted_items = []
        replacements = []  # List of (start, end, mask) tuples
        
        for entity in entities:
            if not entity["word_ids"]:
                continue
                
            # Get character spans from offset mapping
            entity_start_idx = entity["start_idx"]
            entity_end_idx = entity["start_idx"] + len(entity["tokens"]) - 1
            
            # Bounds check
            if entity_start_idx >= len(offset_mapping) or entity_end_idx >= len(offset_mapping):
                continue
            
            # Find the actual character span in original text
            # Use the first token's start and last token's end
            start_char = int(offset_mapping[entity_start_idx][0])
            end_char = int(offset_mapping[entity_end_idx][1])
            
            # Skip if invalid offsets (special tokens) or out of bounds
            if start_char == 0 and end_char == 0:
                continue
            if start_char >= len(text) or end_char > len(text):
                continue
            if start_char >= end_char:
                continue
            
            # Extract the actual text span
            entity_text = text[start_char:end_char].strip()
            
            if entity_text:
                redacted_items.append(entity_text)
                
                # Determine mask based on entity type
                first_label = labels[entity["start_idx"]]
                if entity["type"] == "NAME":
                    mask = "[BNAME]" if first_label == "B-NAME" else "[INAME]"
                else:
                    mask = LABEL_TO_MASK.get(f"B-{entity['type']}", f"[{entity['type']}]")
                
                replacements.append((start_char, end_char, mask))
        
        # Sort replacements by start position (reverse order for safe replacement)
        replacements.sort(key=lambda x: x[0], reverse=True)
        
        # Build sanitized text by replacing from end to start
        sanitized_text = text
        for start_char, end_char, mask in replacements:
            sanitized_text = (
                sanitized_text[:start_char] + 
                mask + 
                sanitized_text[end_char:]
            )
        
        return SanitizeResponse(
            sanitized_message=sanitized_text,
            redacted_items=redacted_items
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

