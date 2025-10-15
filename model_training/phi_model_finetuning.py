from transformers import AutoTokenizer, AutoModelForTokenClassification, TrainingArguments, Trainer
from datasets import load_dataset


import torch

# Check if MPS is available
if torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using MPS device for GPU acceleration.")
else:
    device = torch.device("cpu")
    print("Fallback to CPU.")

model_name = "google/mobilebert-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
# We'll update this after we know the actual number of labels
model = None

# Assume you’ve converted your dataset into Hugging Face DatasetDict with 'tokens' and 'labels'
dataset = load_dataset("json", data_files={
    "train": "phi_train.json",
    "validation": "phi_val.json",
    "test": "phi_test.json"
})

# Get unique labels from the dataset
label_list = list(set([label for labels in dataset["train"]["labels"] for label in labels]))
label_list.sort()  # Sort for consistency

# Create label to id mapping
label_to_id = {label: idx for idx, label in enumerate(label_list)}
id_to_label = {idx: label for label, idx in label_to_id.items()}

print(f"Found {len(label_list)} unique labels: {label_list}")

# Now initialize the model with the correct number of labels
model = AutoModelForTokenClassification.from_pretrained(
    model_name, 
    num_labels=len(label_list),
    use_safetensors=True
)

# ✅ Inject real labels into the model config
model.config.label2id = label_to_id
model.config.id2label = id_to_label

def tokenize_and_align_labels(examples):
    tokenized_inputs = tokenizer(
        examples["tokens"], 
        truncation=True, 
        padding="max_length",
        max_length=128,
        is_split_into_words=True
    )
    labels = []
    for i, label in enumerate(examples["labels"]):
        word_ids = tokenized_inputs.word_ids(batch_index=i)
        # Convert string labels to numeric IDs
        aligned_labels = [-100 if w is None else label_to_id[label[w]] for w in word_ids]
        labels.append(aligned_labels)
    tokenized_inputs["labels"] = labels
    return tokenized_inputs

tokenized_datasets = dataset.map(tokenize_and_align_labels, batched=True)

training_args = TrainingArguments(
    output_dir="./mobilebert-phi",
    eval_strategy="epoch",  # Changed from evaluation_strategy to eval_strategy
    learning_rate=3e-5,
    per_device_train_batch_size=16,
    num_train_epochs=5,
    weight_decay=0.01,
    push_to_hub=False,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["validation"],
    tokenizer=tokenizer,
)

trainer.train()
trainer.save_model("./mobilebert_phi_finetuned")
