from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch

model_dir = "mobilebert_phi_finetuned"
tokenizer = AutoTokenizer.from_pretrained(model_dir)
model = AutoModelForTokenClassification.from_pretrained(model_dir)
model.eval()

# Example dummy input
dummy = tokenizer("My name is John Doe", return_tensors="pt")

# Export to ONNX
torch.onnx.export(
    model,
    (dummy["input_ids"], dummy["attention_mask"]),
    "mobilebert_phi_finetuned.onnx",
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={"input_ids": {0: "batch", 1: "sequence"}, "attention_mask": {0: "batch", 1: "sequence"}},
    opset_version=13
)