# """
# Batch populate Word2Vec (GoogleNews 300d) embeddings for resources_staging.w2v_embedding.

# Requirements:
# - Local GoogleNews model file (e.g., GoogleNews-vectors-negative300.bin). No online download here.
# - Python deps: gensim, supabase (supabase-py), numpy.

# Env vars:
# - SUPABASE_URL               : e.g., https://xxxx.supabase.co
# - SUPABASE_SERVICE_KEY       : service role key (keep secret)
# - W2V_MODEL_PATH             : absolute path to the GoogleNews model file
# - TABLE_NAME (optional)      : defaults to resources_staging
# - BATCH_SIZE (optional)      : defaults to 500

# Usage:
#   python scripts/populate_w2v_embeddings.py
#   python scripts/populate_w2v_embeddings.py --force   # overwrite existing embeddings
# """

# import argparse
# import json
# import os
# import sys
# from typing import Iterable, List, Optional

# import numpy as np
# from gensim.models import KeyedVectors
# from supabase import Client, create_client


# def parse_env() -> dict:
#     env = {
#         "url": os.environ.get("SUPABASE_URL"),
#         "service_key": os.environ.get("SUPABASE_SERVICE_KEY"),
#         "model_path": os.environ.get("W2V_MODEL_PATH"),
#         "table": os.environ.get("TABLE_NAME", "resources_staging"),
#         "batch_size": int(os.environ.get("BATCH_SIZE", "500")),
#     }
#     missing = [k for k, v in env.items() if k in ("url", "service_key", "model_path") and not v]
#     if missing:
#         raise SystemExit(f"Missing required env vars: {', '.join(missing)}")
#     if not os.path.exists(env["model_path"]):
#         raise SystemExit(f"Model file not found at W2V_MODEL_PATH={env['model_path']}")
#     return env


# def load_model(path: str) -> KeyedVectors:
#     print(f"Loading Word2Vec model from {path} ...")
#     model = KeyedVectors.load_word2vec_format(path, binary=path.lower().endswith(".bin"))
#     print("Model loaded.")
#     return model


# def normalize_tags(value: Optional[object]) -> List[str]:
#     """Accept list, JSON array string, or comma/space separated string."""
#     if value is None:
#         return []
#     if isinstance(value, list):
#         return [str(v).strip() for v in value if str(v).strip()]
#     if isinstance(value, str):
#         text = value.strip()
#         if not text:
#             return []
#         if text.startswith("[") and text.endswith("]"):
#             try:
#                 arr = json.loads(text)
#                 if isinstance(arr, list):
#                     return [str(v).strip() for v in arr if str(v).strip()]
#             except json.JSONDecodeError:
#                 pass
#         # fallback: treat as comma/space separated
#         parts = [p.strip() for p in text.replace(",", " ").split() if p.strip()]
#         return parts
#     return []


# def build_doc(row: dict) -> str:
#     parts = [
#         str(row.get("title") or "").strip(),
#         str(row.get("short_desc") or "").strip(),
#         " ".join(normalize_tags(row.get("symptom_tags"))),
#         " ".join(normalize_tags(row.get("tags"))),
#     ]
#     return " | ".join([p for p in parts if p])


# def text_to_vec(model: KeyedVectors, text: str) -> Optional[np.ndarray]:
#     tokens = [t for t in text.lower().split() if t in model.key_to_index]
#     if not tokens:
#         return None
#     return np.mean(model[tokens], axis=0)


# def get_client(url: str, service_key: str) -> Client:
#     return create_client(url, service_key)


# def fetch_batch(client: Client, table: str, offset: int, limit: int) -> Iterable[dict]:
#     resp = (
#         client.table(table)
#         .select("id,title,short_desc,symptom_tags,tags,w2v_embedding")
#         .range(offset, offset + limit - 1)
#         .execute()
#     )
#     return resp.data or []


# def write_embedding(client: Client, table: str, row_id: str, vec: np.ndarray) -> None:
#     client.table(table).update({"w2v_embedding": vec.tolist()}).eq("id", row_id).execute()


# def main() -> None:
#     parser = argparse.ArgumentParser(description="Populate Word2Vec embeddings for resources_staging")
#     parser.add_argument("--force", action="store_true", help="overwrite rows that already have w2v_embedding")
#     args = parser.parse_args()

#     env = parse_env()
#     client = get_client(env["url"], env["service_key"])
#     model = load_model(env["model_path"])

#     offset = 0
#     updated = 0
#     batch_size = env["batch_size"]

#     while True:
#         rows = list(fetch_batch(client, env["table"], offset, batch_size))
#         if not rows:
#             break

#         for row in rows:
#             if row.get("w2v_embedding") and not args.force:
#                 continue

#             doc = build_doc(row)
#             if not doc:
#                 continue

#             vec = text_to_vec(model, doc)
#             if vec is None:
#                 continue

#             write_embedding(client, env["table"], row["id"], vec)
#             updated += 1

#         offset += batch_size
#         print(f"Processed up to offset {offset}, updated so far: {updated}")

#     print(f"Done. Total updated: {updated}")


# if __name__ == "__main__":
#     try:
#         main()
#     except KeyboardInterrupt:
#         sys.exit(1)
