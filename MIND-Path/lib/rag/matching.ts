import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { type IntakeData } from '@/lib/intakeSchema';
/**
 * Retrive and rerank resource matching logic
 */
// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_CONTENT_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_CONTENT_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface MatchedResource {
  id: string;
  title?: string;
  type?: string;
  org?: string;
  url?: string;
  country?: string;
  audience?: string;
  crisis?: boolean;
  language?: string;
  short_desc?: string;
  reliability_score?: number;
  content?: JSON;
  tags_all?: string[];
  symptoms?: string[];
  similarity: number;
  final_score?: number;
}

export interface MatchOptions {
  limit?: number;
  similarityThreshold?: number;
  filters?: {
    type?: string[];
  };
}

/**
 * Build semantic query from intake data
 */
export function buildSemanticQuery(intake: IntakeData): string {
const parts: string[] = [];

  // 1. The Core Match (Matches the 'Keywords' part of the embedding)
  // If they say "anxiety", this matches the "anxiety" tag perfectly.
  parts.push(intake.primary_concern);

  // 2. Symptoms (Matches the 'Keywords' part of the embedding)
  if (intake.key_symptoms && intake.key_symptoms.length > 0) {
    parts.push(intake.key_symptoms.join(' '));
  }

  // 3. Goals (Optional - can be noisy)
  // Only include if it helps describe the *type* of resource (e.g., "coping", "education")
  if (intake.goals) {
    parts.push(intake.goals);
  }

  // Result: "anxiety racing thoughts panic coping"
  return parts.join(' ');
}


/**
 * Match resources to intake data using vector similarity search
 */
export async function matchResources(
  intake: IntakeData,
  options: MatchOptions = {}
): Promise<MatchedResource[]> {
  const { 
    limit = 10, 
    similarityThreshold = 0.25, // Default lowered
    filters = {} 
  } = options;

  try {
    // 1. Build Query (Using your new Tag-focused logic)
    const queryText = buildSemanticQuery(intake);
    
    // 2. Generate Embedding
    const { embedding } = await embed({
      model: google.textEmbeddingModel('text-embedding-004'),
      value: queryText,
    });

    // 3. Search
    // Note: We pass an empty object {} for filter if no types are specified.
    const rpcFilter = (filters.type && filters.type.length > 0) 
      ? { type: filters.type } 
      : {};

    const { data: matches, error } = await supabase.rpc('match_resources', {
      query_embedding: embedding,
      match_threshold: similarityThreshold,
      match_count: limit,
      filter: rpcFilter 
    });

    if (error) throw error;

    return matches || [];

  } catch (error) {
    console.error('Error in matchResources:', error);
    // Return empty array instead of crashing the whole chat
    return []; 
  }
}


