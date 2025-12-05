import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { embedMany } from 'ai';
import { supabase } from '../../lib/supabaseClient'
/**
 * Offline indexing: creates and saves vector embeddings of resource rows
 */
// Load and validate environment variables

const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!geminiApiKey) {
  throw new Error('Missing required environment variable: GOOGLE_GENERATIVE_AI_API_KEY');
}



interface Resource {
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
  license?: string;
  reliability_score?: number;
  last_reviewed?: Date;
  created_at?: Date;
  is_published?: boolean;
  tags_all?: string[];
  
}

/**
 * Build embedding text from resource fields： creates a "document" for each resource
 */
function buildResourceEmbeddingText(resource: Resource): string {
// 1. PRIORITIZE TAGS (best for matching)
  let coreContent = "";
  
  if (resource.tags_all && resource.tags_all.length > 0) {
    // If tags exist, they are the main content.
    coreContent = `Keywords: ${resource.tags_all.join(', ')}.`;
  } else {
    // FALLBACK: If no tags, use description.
    coreContent = `Summary: ${resource.short_desc || resource.title}`;
  }

  // 2. ADD CONTEXT (The "Filter")
  const context = `Type: ${resource.type || 'resource'}.`;

  // 3. FINAL STRING
  return `${coreContent} ${context}`;
}

/**
 * Process resources in batches and generate embeddings
 */
async function embedResources(batchSize: number = 25) {
  try {

    // 1. Get the IDs of resources that NEED embedding
    console.log("Fetching IDs of resources that need embedding from 'resources' table...");
    const { data: resourcesToEmbed, error: idError } = await supabase
      .from('resources')
      .select('id') 
      .is('embedding', null); // looks for any row where the "embedding" column is null

    if (idError) {
      console.error('Error fetching resource IDs:', idError);
      throw idError;
    }

    if (!resourcesToEmbed || resourcesToEmbed.length === 0) {
      console.log('✓ All resources are already embedded. Exiting.');
      return;
    }

    // 2. Extract just the ID strings
    const resourceIds = resourcesToEmbed.map(r => r.id);
    console.log(`Found ${resourceIds.length} resource(s) to embed.`);

    console.log('Starting resource embedding process...\n');

    // 1. Fetch all resources without embeddings using the list of ids
    const { data: resources, error: dataError } = await supabase
      .from('resources')
      .select('*')
      .in('id', resourceIds);

if (dataError) {
      console.error('Error fetching resource details from resources:', dataError);
      throw dataError;
    }

    if (!resources || resources.length === 0) {
      console.log('Warning: Found IDs to embed, but no matching data in resources_public. Check view permissions.');
      return;
    }

    console.log(`Found ${resources.length} resources to embed.`);
    console.log(`Processing in batches of ${batchSize}...\n`);

    let successCount = 0;
    let failCount = 0;

    // 2. Process in batches
    for (let i = 0; i < resources.length; i += batchSize) {
      const batch = resources.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(resources.length / batchSize);

      console.log(`\n=== Batch ${batchNumber}/${totalBatches} ===`);
      console.log(`Processing resources ${i + 1} to ${Math.min(i + batchSize, resources.length)}`);

      try {
        // Build embedding texts for this batch
        const embeddingTexts = batch.map(resource => 
          buildResourceEmbeddingText(resource)
        );

        console.log(`Generating ${batch.length} embeddings...`);

        // Generate embeddings in batch using AI SDK
        const { embeddings } = await embedMany({
          model: google.textEmbeddingModel('text-embedding-004'),
          values: embeddingTexts,
        });

        console.log(`✓ Generated ${embeddings.length} embeddings`);
        console.log('Saving to database...');

        // 3. Save embeddings to database
        for (let j = 0; j < batch.length; j++) {
          const resource = batch[j];
          const embedding = embeddings[j];

          const { error: updateError } = await supabase
            .from('resources')
            .update({ embedding })
            .eq('id', resource.id);

          if (updateError) {
            console.error(`  ✗ Failed to save ${resource.title}:`, updateError);
            failCount++;
          } else {
            console.log(`  ✓ Saved: ${resource.title}`);
            successCount++;
          }
        }

        // Small delay between batches to respect rate limits
        if (i + batchSize < resources.length) {
          console.log('Waiting before next batch...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`\n✗ Error processing batch ${batchNumber}:`, error);
        failCount += batch.length;
      }
    }

    // Summary
    console.log('\n\n=== Embedding Complete ===');
    console.log(`✓ Successfully embedded: ${successCount}`);
    console.log(`✗ Failed: ${failCount}`);
    console.log(`Total processed: ${resources.length}`);

  } catch (error) {
    console.error('Fatal error in embedResources:', error);
    process.exit(1);
  }
}

// Run the script
const BATCH_SIZE = 25; // Adjust based on your rate limits

embedResources(BATCH_SIZE)
  .then(() => {
    console.log('\n✓ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });