
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function checkChunkStatus() {
  const { data: chunks, error } = await supabase
    .from('note_chunks')
    .select('id, section_title, status, is_ready, word_count, questions(count)')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Hata:', error)
    return
  }

  console.log('--- Son Not Parçaları (Chunks) ---')
  chunks.forEach(c => {
    console.log(`Konu: ${c.section_title}`)
    console.log(`Durum: ${c.status}`)
    console.log(`Hazır mı: ${c.is_ready}`)
    console.log(`Kelime: ${c.word_count}`)
    console.log(`Mevcut Soru Sayısı: ${c.questions?.[0]?.count || 0}`)
    console.log('---')
  })
}

checkChunkStatus()
