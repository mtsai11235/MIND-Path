"""
Generate a synthetic PHI (Protected Health Information) dataset
for fine-tuning MobileBERT (or any token classification model).

Each sample contains:
  - 'tokens': list of wordpieces
  - 'labels': BIO labels corresponding to PHI entities
"""

import random
import json
from tqdm import tqdm
from faker import Faker
from transformers import AutoTokenizer

fake = Faker()
tokenizer = AutoTokenizer.from_pretrained("google/mobilebert-uncased")

# 18 HIPAA identifiers → label map
PHI_TAGS = [
    "NAME", "LOCATION", "DATE", "PHONE", "FAX", "EMAIL", "SSN", "MRN",
    "HEALTHPLAN", "ACCOUNT", "LICENSE", "VEHICLE", "DEVICE", "URL",
    "IP", "BIOMETRIC", "FACE", "ID"
]

# ---------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------

def random_date():
    return fake.date_between(start_date='-10y', end_date='today').strftime("%B %d, %Y")

def random_mrn():
    return f"MRN-{fake.random_int(10000, 99999)}"

def random_healthplan():
    return f"HP-{fake.random_int(100000,999999)}"

def random_account():
    return f"ACC-{fake.random_int(100000,999999)}"

def random_license():
    return f"LIC-{fake.random_int(1000,9999)}"

def random_vehicle():
    return f"VIN {fake.bothify(text='??####??#?#?#')}".upper()

def random_device():
    return f"Device SN{fake.random_int(1000,99999)}"

def random_id():
    return f"ID-{fake.random_int(1000,9999)}"

# ---------------------------------------------------------------------
# Template sentences — include different HIPAA identifiers
# ---------------------------------------------------------------------

TEMPLATES = [
    # Medical record examples
    "Patient {NAME} was admitted on {DATE} to {LOCATION}. Contact number: {PHONE}, email: {EMAIL}.",
    "SSN {SSN} belongs to {NAME}. Medical record {MRN} and insurance {HEALTHPLAN} are linked.",
    "{NAME} visited {LOCATION} clinic on {DATE}. Fax: {FAX}, Phone: {PHONE}.",
    "Doctor noted {NAME}'s device {DEVICE} with serial number scanned.",
    "{NAME}'s account {ACCOUNT} and license {LICENSE} were verified on {DATE}.",
    "Vehicle {VEHICLE} was parked outside {LOCATION} on {DATE}.",
    "Data uploaded to {URL} from IP {IP}. Record {MRN}.",
    "Biometric data (fingerprint) and full-face photo were captured for {NAME}.",
    "{NAME} (ID: {ID}) visited hospital on {DATE}.",

    # Conversational examples
    # First person
    "My name is {NAME} and I live in {LOCATION}.",
    "You can call me at {PHONE} or email {EMAIL}.",
    "I was born on {DATE}, and I’m from {LOCATION}.",
    "My insurance ID is {HEALTHPLAN}.",
    "I connected my device {DEVICE} yesterday.",

    # Second person
    "Hey {NAME}, I sent your results to {EMAIL}.",
    "You told me your appointment was on {DATE}, right?",
    "I think your MRN is {MRN}, isn’t it?",
    "They uploaded your data from IP {IP}.",
    "Can you confirm your SSN {SSN} again?",
    
    # Third person
    "{NAME} was admitted to {LOCATION} on {DATE}.",
    "The MRN for {NAME} is {MRN} and the SSN is {SSN}.",
    "Records for {NAME} were uploaded from IP {IP}.",
    "{NAME}’s insurance ID {HEALTHPLAN} is linked to account {ACCOUNT}.",
    "Dr. {DOCTOR} reported that {NAME}’s biometric scan matched their file.",
]

# ---------------------------------------------------------------------
# Dataset generator
# ---------------------------------------------------------------------

def fill_template(template):
    """Fill placeholders with fake data values."""
    values = {
        "NAME": fake.name(),
        "LOCATION": fake.city(),
        "DATE": random_date(),
        "PHONE": fake.phone_number(),
        "FAX": fake.phone_number(),
        "EMAIL": fake.email(),
        "SSN": fake.ssn(),
        "MRN": random_mrn(),
        "HEALTHPLAN": random_healthplan(),
        "ACCOUNT": random_account(),
        "LICENSE": random_license(),
        "VEHICLE": random_vehicle(),
        "DEVICE": random_device(),
        "URL": fake.url(),
        "IP": fake.ipv4(),
        "BIOMETRIC": "fingerprint scan",
        "FACE": "facial photo",
        "ID": random_id(),
    }
    text = template
    for k, v in values.items():
        text = text.replace(f"{{{k}}}", v)
    return text, values

def tokenize_and_label(text, values):
    """Tokenize text and align BIO labels to tokens."""
    tokens = tokenizer.tokenize(text)
    labels = ["O"] * len(tokens)

    for tag, val in values.items():
        sub_tokens = tokenizer.tokenize(val)
        for i in range(len(tokens) - len(sub_tokens) + 1):
            if tokens[i:i+len(sub_tokens)] == sub_tokens:
                labels[i] = f"B-{tag}"
                for j in range(1, len(sub_tokens)):
                    labels[i+j] = f"I-{tag}"
                break
    return {"tokens": tokens, "labels": labels, "text": text}

def generate_dataset(n_samples=50000, seed=42):
    random.seed(seed)
    Faker.seed(seed)
    dataset = []

    for _ in tqdm(range(n_samples), desc="Generating synthetic PHI samples"):
        template = random.choice(TEMPLATES)
        text, values = fill_template(template)
        dataset.append(tokenize_and_label(text, values))
    return dataset

# ---------------------------------------------------------------------
# Main script
# ---------------------------------------------------------------------

if __name__ == "__main__":
    dataset = generate_dataset(20000)  # adjust size here
    random.shuffle(dataset)

    # Split into train/val/test
    n = len(dataset)
    train, val, test = dataset[:int(0.8*n)], dataset[int(0.8*n):int(0.9*n)], dataset[int(0.9*n):]

    def save_split(data, name):
        with open(f"phi_{name}.json", "w") as f:
            json.dump(data, f, indent=2)

    save_split(train, "train")
    save_split(val, "val")
    save_split(test, "test")

    print("✅ Synthetic PHI dataset saved as phi_train.json / phi_val.json / phi_test.json")
