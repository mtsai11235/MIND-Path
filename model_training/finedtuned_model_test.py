from transformers import AutoTokenizer, AutoModelForTokenClassification, Trainer, DataCollatorForTokenClassification
from datasets import load_dataset
import numpy as np
import evaluate
import os

model_dir = os.path.abspath("./mobilebert_phi_finetuned")

tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
model = AutoModelForTokenClassification.from_pretrained(model_dir, local_files_only=True)

# Load test data
dataset = load_dataset("json", data_files={"test": "phi_test.json"})
test_dataset = dataset["test"]
# Get unique labels from the dataset
label_list = list(set([label for labels in test_dataset["labels"] for label in labels]))
label_list.sort()  # Sort for consistency

# Create label to id mapping
label_to_id = {label: idx for idx, label in enumerate(label_list)}
id_to_label = {idx: label for label, idx in label_to_id.items()}

# inspect a sample
print(test_dataset[0])

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

tokenized_test = test_dataset.map(tokenize_and_align_labels, batched=True)

# Load F1 metric
metric = evaluate.load("seqeval")

def compute_metrics(p):
    predictions, labels = p
    predictions = np.argmax(predictions, axis=2)

    true_labels = [
        [id_to_label[label_id] for (label_id, pred_id) in zip(label_row, pred_row) if label_id != -100]
        for label_row, pred_row in zip(labels, predictions)
    ]
    true_predictions = [
        [id_to_label[pred_id] for (label_id, pred_id) in zip(label_row, pred_row) if label_id != -100]
        for label_row, pred_row in zip(labels, predictions)
    ]

    results = metric.compute(predictions=true_predictions, references=true_labels)
    return {
        "precision": results["overall_precision"],
        "recall": results["overall_recall"],
        "f1": results["overall_f1"],
        "accuracy": results["overall_accuracy"],
    }

data_collator = DataCollatorForTokenClassification(tokenizer)

trainer = Trainer(
    model=model,
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

results = trainer.evaluate(tokenized_test)
print(results)
