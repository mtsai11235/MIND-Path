// scripts/embed_mh_whitelist.mjs
// This script generates embeddings for mh_whitelist.label
// using Gemini (text-embedding-004) and stores them in label_embedding.

import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// --- Load env variables from .env ---
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Please set GOOGLE_GENERATIVE_AI_API_KEY, EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE in .env"
  );
  process.exit(1);
}

// --- Init Gemini + Supabase clients ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // 1) Fetch rows without embeddings yet
  const { data: rows, error } = await supabase
    .from("mh_whitelist")
    .select("code, label, label_embedding")
    .is("label_embedding", null);

  if (error) {
    console.error("Select error:", error);
    process.exit(1);
  }

  console.log(`Need to embed ${rows?.length ?? 0} rows`);

  for (const row of rows ?? []) {
    const text = row.label;
    console.log("Embedding:", row.code, "-", text);

    // 2) Call Gemini to get a 768-dim embedding
    const response = await embeddingModel.embedContent(text);
    const embedding = response.embedding.values;

    // 3) Store embedding back into mh_whitelist
    const { error: upError } = await supabase
      .from("mh_whitelist")
      .update({ label_embedding: embedding })
      .eq("code", row.code);

    if (upError) {
      console.error("Update error for code", row.code, upError);
      process.exit(1);
    }
  }

  console.log("✅ All embeddings written to mh_whitelist.label_embedding");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});