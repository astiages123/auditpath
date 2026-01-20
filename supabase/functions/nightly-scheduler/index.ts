
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log('Running nightly scheduler...');

  try {
    // 1. Fetch all chunks
    // Optimization: fetch only necessary columns
    const { data: chunks, error } = await supabaseClient
      .from('note_chunks')
      .select('id, word_count, metadata');

    if (error) throw error;
    if (!chunks) return new Response(JSON.stringify({ message: 'No chunks found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    let jobsCreated = 0;

    for (const chunk of chunks) {
        // Calculate Quota (Simplified logic here, ideally share code or use DB function)
        // Replicating basic logic from quiz-api.ts
        const wordCount = chunk.word_count || 0;
        const conceptCount = (chunk.metadata?.concept_map?.length) || 0;
        
        let baseCount = 4;
        if (wordCount > 150) baseCount = 8;
        if (wordCount > 500) baseCount = 12;
        if (wordCount > 1200) baseCount = 20;

        const quotaTotal = baseCount; // Simplified for now
        const antrenmanTarget = Math.max(1, quotaTotal);
        const arsivTarget = Math.floor(antrenmanTarget * 0.25);
        const denemeTarget = Math.floor(antrenmanTarget * 0.25);

        // Check Existing Counts
        // Use count aggregation via RPC or separate queries? 
        // Separate queries for N chunks is bad.
        // Better: Fetch ALL questions stats in one query if possible.
        // For now, doing it strictly per chunk is slow but safe for MVP.
        
        const { count: antrenmanCurrent } = await supabaseClient.from('questions').select('*', { count: 'exact', head: true }).eq('chunk_id', chunk.id).eq('usage_type', 'antrenman');
        const { count: arsivCurrent } = await supabaseClient.from('questions').select('*', { count: 'exact', head: true }).eq('chunk_id', chunk.id).eq('usage_type', 'arsiv');
        const { count: denemeCurrent } = await supabaseClient.from('questions').select('*', { count: 'exact', head: true }).eq('chunk_id', chunk.id).eq('usage_type', 'deneme');

        // Logic:
        // 1. Gap in Antrenman? Priority 1
        const antrenmanGap = antrenmanTarget - (antrenmanCurrent || 0);
        if (antrenmanGap > 0) {
            // Check if job already exists
            const { count: pendingJobs } = await supabaseClient.from('generation_jobs').select('*', { count: 'exact', head: true }).eq('chunk_id', chunk.id).eq('job_type', 'ANTRENMAN').in('status', ['PENDING', 'PROCESSING']);
            if (pendingJobs === 0) {
                await supabaseClient.from('generation_jobs').insert({
                    chunk_id: chunk.id,
                    job_type: 'ANTRENMAN',
                    target_count: antrenmanGap,
                    priority: 1
                });
                jobsCreated++;
            }
        } else {
            // 2. Antrenman Full -> Check Arşiv/Deneme (Priority 2)
            const arsivGap = arsivTarget - (arsivCurrent || 0);
            if (arsivGap > 0) {
                 const { count: pendingJobs } = await supabaseClient.from('generation_jobs').select('*', { count: 'exact', head: true }).eq('chunk_id', chunk.id).eq('job_type', 'ARSIV').in('status', ['PENDING', 'PROCESSING']);
                 if (pendingJobs === 0) {
                    await supabaseClient.from('generation_jobs').insert({
                        chunk_id: chunk.id,
                        job_type: 'ARSIV',
                        target_count: arsivGap,
                        priority: 2
                    });
                    jobsCreated++;
                 }
            }

            const denemeGap = denemeTarget - (denemeCurrent || 0);
            if (denemeGap > 0) {
                 const { count: pendingJobs } = await supabaseClient.from('generation_jobs').select('*', { count: 'exact', head: true }).eq('chunk_id', chunk.id).eq('job_type', 'DENEME').in('status', ['PENDING', 'PROCESSING']);
                 if (pendingJobs === 0) {
                    await supabaseClient.from('generation_jobs').insert({
                        chunk_id: chunk.id,
                        job_type: 'DENEME',
                        target_count: denemeGap,
                        priority: 2
                    });
                    jobsCreated++;
                 }
            }
        }
    }

    // Trigger processing if jobs were created
    if (jobsCreated > 0) {
       const supabaseUrl = Deno.env.get('SUPABASE_URL');
       const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); 
       if (supabaseUrl && serviceKey) {
           console.log('Triggering process-queue...');
           fetch(`${supabaseUrl}/functions/v1/process-queue`, {
               method: 'POST',
               headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
               body: JSON.stringify({ trigger: 'nightly' })
           }).catch(e => console.error('Trigger failed', e));
       }
    }

    return new Response(JSON.stringify({ message: 'Scheduler finished', jobsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
