
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || '';
const MODEL = 'xiaomi/mimo-v2-flash:free';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Create Supabase Client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 1. Fetch NEXT pending job
    // We use a simple select + update lock strategy
    
    // Manual lock approach:
    const { data: jobs } = await supabaseClient
        .from('generation_jobs')
        .select('*')
        .eq('status', 'PENDING')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1);


    if (!jobs || jobs.length === 0) {
        return new Response(JSON.stringify({ message: 'No jobs pending' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const currentJob = jobs[0];

    // Lock it
    const { error: lockError } = await supabaseClient
        .from('generation_jobs')
        .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
        .eq('id', currentJob.id)
        .eq('status', 'PENDING'); // Concurrency check

    if (lockError) {
        // Someone else grabbed it
        return new Response(JSON.stringify({ message: 'Race condition, skipping' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Process the job
    console.log(`Processing job ${currentJob.id} (${currentJob.job_type}) for Chunk ${currentJob.chunk_id}`);
    
    // Get Chunk Content
    const { data: chunk } = await supabaseClient
        .from('note_chunks')
        .select('course_id, section_title, content, metadata')
        .eq('id', currentJob.chunk_id)
        .single();
        
    if (!chunk) {
        await supabaseClient.from('generation_jobs').update({ status: 'FAILED', error_message: 'Chunk not found' }).eq('id', currentJob.id);
        return new Response(JSON.stringify({ error: 'Chunk not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build Prompt (Simplified version of quiz-api.ts)
    const prompt = buildPrompt(chunk, currentJob.job_type);
    
    // Call AI
    const aiResponse = await callOpenRouter(prompt);
    
    if (!aiResponse) {
         // Retry calculation
         const newAttempts = currentJob.attempts + 1;
         const status = newAttempts >= 3 ? 'FAILED' : 'PENDING'; // Retry
         await supabaseClient.from('generation_jobs').update({ attempts: newAttempts, status, error_message: 'AI API Failed' }).eq('id', currentJob.id);
         throw new Error('AI Generation Failed');
    }

    // Parse Response
    const questionData = parseQuizResponse(aiResponse);
    if (!questionData) {
         await supabaseClient.from('generation_jobs').update({ attempts: currentJob.attempts + 1, status: 'PENDING', error_message: 'Invalid JSON from AI' }).eq('id', currentJob.id);
          throw new Error('Invalid JSON');
    }

    // Save Question
    const { error: saveError } = await supabaseClient.from('questions').insert({
        course_id: chunk.course_id,
        chunk_id: currentJob.chunk_id,
        section_title: chunk.section_title,
        question_data: questionData,
        usage_type: currentJob.job_type.toLowerCase(), // 'ANTRENMAN' -> 'antrenman'
        is_global: true,
        validation_status: 'APPROVED' // Auto-approve for now
    });

    if (saveError) {
         await supabaseClient.from('generation_jobs').update({ status: 'FAILED', error_message: saveError.message }).eq('id', currentJob.id);
         throw saveError;
    }

    // Update Job Status
    // Decrement target_count
    const newCount = currentJob.target_count - 1;
    if (newCount > 0) {
        await supabaseClient.from('generation_jobs').update({ target_count: newCount, status: 'PENDING' }).eq('id', currentJob.id);
        
        // Recursive Trigger
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); 
        
        if (supabaseUrl && serviceKey) {
             console.log('Recursively triggering next job...');
             fetch(`${supabaseUrl}/functions/v1/process-queue`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trigger: 'recursive' })
            }).catch(e => console.error('Recursive trigger failed', e));
        }

    } else {
        await supabaseClient.from('generation_jobs').update({ target_count: 0, status: 'COMPLETED' }).eq('id', currentJob.id);
    }

    return new Response(JSON.stringify({ success: true, remaining: newCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

// --- Helpers ---

async function callOpenRouter(prompt: string) {
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content;
    } catch (e) {
        console.error('AI Call Error:', e);
        return null;
    }
}

function parseQuizResponse(text: string) {
    try {
        let jsonStr = text.trim();
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonStr = match[1];
        
        try {
             return JSON.parse(jsonStr);
        } catch {
             const objMatch = jsonStr.match(/\{[\s\S]*\}/);
             if (objMatch) return JSON.parse(objMatch[0]);
        }
        return null;
    } catch(e) {
        return null;
    }
}

function buildPrompt(chunk: any, type: string) {
    return `## DERS NOTU:
Konu: ${chunk.section_title}

${chunk.content}

## GÖREV:
Yukarıdaki notu kullanarak KPSS formatında BİR adet çoktan seçmeli soru üret.
Zorluk Seviyesi: ${type === 'ANTRENMAN' ? 'Orta (Bilgi/Kavrama)' : type === 'ARSIV' ? 'Kolay (Hatırlama)' : 'Zor (Analiz)'}
Cevabı SADECE JSON formatında ver.`;
}

const SYSTEM_PROMPT = `Sen KPSS soru uzmanısın.
JSON Formatı:
{
  "q": "Soru metni",
  "o": ["A", "B", "C", "D", "E"],
  "a": 0, // 0=A, 1=B...
  "exp": "Açıklama"
}
`;
