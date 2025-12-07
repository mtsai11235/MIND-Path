from transformers import AutoModel, AutoTokenizer
import torch
from transformers import pipeline

model_path = "./mobilebert-bert_phi_finetuned"
model = AutoModel.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

text = "My name is John and I live in New York."


pipeline = pipeline(
    task="ner",
    model=model_path
)

ner_result = pipeline(text)
expectedResult = [x for x in ner_result if x['word']=='john']
print(expectedResult)