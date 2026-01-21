
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js'
import { Resend } from 'npm:resend'
import OpenAI from 'npm:openai'

import { Database } from '../_shared/database.types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '';
const TEST_EMAIL = Deno.env.get('TEST_EMAIL');

// Helpers
function getDates(weeksAgo: number = 0) {
  const end = new Date();
  end.setDate(end.getDate() - (weeksAgo * 7));
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} sa. ${minutes} dk.`;
}

async function getWeeklyStats(supabase: SupabaseClient<Database>, userId: string, weeksAgo: number) {
  const { start, end } = getDates(weeksAgo);

  // 1. Pomodoro & Radar Data
  const { data: sessions } = await supabase
    .from('pomodoro_sessions')
    .select('total_work_time, course_name')
    .eq('user_id', userId)
    .gt('created_at', start)
    .lte('created_at', end);
  
  const totalWorkSeconds = sessions?.reduce((acc: number, curr: any) => acc + (Number(curr.total_work_time) || 0), 0) || 0;
  const totalWorkHours = Number((totalWorkSeconds / 60 / 60).toFixed(1));

  // Radar Data (Group by course)
  const courseDist: Record<string, number> = {};
  sessions?.forEach((s: any) => {
      const name = s.course_name || 'Diğer';
      courseDist[name] = (courseDist[name] || 0) + (Number(s.total_work_time) || 0);
  });
  // Convert seconds to hours for radar
  const radarData = Object.entries(courseDist).map(([name, seconds]) => ({
      subject: name,
      hours: Number((seconds / 3600).toFixed(1))
  })).sort((a, b) => b.hours - a.hours).slice(0, 5); // Top 5

  // 2. Quiz Detailed Stats
  const { data: quizProgress } = await supabase
    .from('user_quiz_progress')
    .select('response_type')
    .eq('user_id', userId)
    .gt('answered_at', start)
    .lte('answered_at', end);

  const totalQuestions = quizProgress?.length || 0;
  const correctCount = quizProgress?.filter((q: any) => q.response_type === 'correct').length || 0;
  const incorrectCount = quizProgress?.filter((q: any) => q.response_type === 'incorrect').length || 0;
  const blankCount = quizProgress?.filter((q: any) => q.response_type === 'blank').length || 0;
  
  const successRate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // 3. Completed Videos
  const { data: completedVideos } = await supabase
    .from('video_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('completed', true)
    .gt('completed_at', start)
    .lte('completed_at', end);
    
  const totalVideos = completedVideos?.length || 0;

  return { 
      totalWorkHours, 
      totalWorkSeconds, 
      radarData,
      totalQuestions, 
      questionStats: { correct: correctCount, incorrect: incorrectCount, blank: blankCount },
      successRate,
      totalVideos 
  };
}

async function getMasteryUpdates(supabase: SupabaseClient<Database>, userId: string) {
    const { start } = getDates(0);
    
    // Fetch recent mastery updates
    const { data: masteryRaw } = await supabase
      .from('chunk_mastery')
      .select('chunk_id, mastery_score, updated_at')
      .eq('user_id', userId)
      .gt('updated_at', start)
      .order('updated_at', { ascending: false })
      .limit(3);

    if (!masteryRaw || (masteryRaw as any[]).length === 0) return [];

    const chunkIds = (masteryRaw as any[]).map((m: any) => m.chunk_id);
    const { data: chunks } = await supabase.from('note_chunks').select('id, section_title').in('id', chunkIds);

    return (masteryRaw as any[]).map((m: any) => ({
        ...m,
        title: (chunks as any[])?.find((c: any) => c.id === m.chunk_id)?.section_title || 'Bilinmeyen Konu'
    }));
}

async function generateAIInsight(openai: OpenAI | null, current: any, previous: any) {
  if (!openai) return "Harika bir hafta geçirdin! İstikrarını korumaya devam et. 🚀";

  const prompt = `
    Aşağıdaki öğrenci verilerine göre haftalık, motive edici ve kişisel bir koçluk yorumu yaz.
    Sen arkadaş canlısı bir yapay zeka koçusun.
    
    ÖNEMLİ KURALLAR:
    1. Yanıtını oluştururken asla Markdown sembolleri (**, #, -, vb.) kullanma.
    2. Kalın olmasını istediğin yerler için doğrudan HTML etiketleri (<b> veya <strong>) kullan.
    3. Çok temiz ve sadece çözüm odaklı bir metin üret.
    
    Bu Hafta: ${current.totalWorkHours} saat çalışma, ${current.totalQuestions} soru, %${current.successRate} başarı.
    Geçen Hafta: ${previous.totalWorkHours} saat çalışma, ${previous.totalQuestions} soru, %${previous.successRate} başarı.
    
    Eğer gelişme varsa öv, düşüş varsa nazikçe teşvik et.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "mistralai/devstral-2512:free", 
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
    }, {
      headers: {
        "HTTP-Referer": "https://auditpath.app", 
        "X-Title": "AuditPath"
      }
    });
    return response.choices[0]?.message?.content || "Harika çalışmalar! Aynen devam.";
  } catch (e) {
    console.error("AI Error:", e);
    return "Başarı yolculuğunda her adım önemli. Devam et! 🌟";
  }
}

function getComparisonBadge(current: number, previous: number, suffix: string = '') {
    const diff = current - previous;
    const isPositive = diff > 0;
    const isZero = diff === 0;
    const color = isPositive ? '#5eead4' : isZero ? '#f3f4f6' : '#ef4444'; // Mint, Whitish, Red
    
    if (isZero) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 2px;"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
        return `<span style="color: ${color}; font-size: 12px; font-weight: 700; background: ${color}15; padding: 2px 8px; border-radius: 99px; display: inline-flex; align-items: center;">Değişim Yok ${icon}</span>`;
    }

    const icon = isPositive 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 2px;"><path d="M9 19h6"/><path d="M9 15v-3H5l7-7 7 7h-4v3H9z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 2px;"><path d="M15 5H9"/><path d="M15 9v3h4l-7 7-7-7h4V9h4z"/></svg>`;

    const val = `%${Math.abs(Math.round((diff / (previous || 1)) * 100))}`;
    
    return `<span style="color: ${color}; font-size: 12px; font-weight: 700; background: ${color}20; padding: 2px 8px; border-radius: 99px; display: inline-flex; align-items: center;">${val} ${icon}</span>`;
}

function generateRadarChartUrl(radarData: { subject: string, hours: number }[]) {
     if (!radarData || radarData.length === 0) {
        // Fallback if no data
        radarData = [{ subject: 'Veri Yok', hours: 0 }];
     }

     const chartConfig = {
        type: 'radar',
        data: {
          labels: radarData.map(d => d.subject),
          datasets: [{
            label: 'Çalışma (Saat)',
            data: radarData.map(d => d.hours),
            backgroundColor: 'rgba(124, 58, 237, 0.4)', // Transparent Purple
            borderColor: '#7c3aed', 
            borderWidth: 2,
            pointBackgroundColor: '#a78bfa',
          }]
        },
        options: {
          legend: { display: false },
          scale: {
             ticks: { beginAtZero: true, display: false, maxTicksLimit: 5 },
             gridLines: { color: 'rgba(255,255,255,0.1)' },
             pointLabels: { fontSize: 12, fontColor: '#d1d5db' }, // Light text labels
             angleLines: { color: 'rgba(255,255,255,0.1)' } 
          }
        }
      };
      
      return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=400&bkg=%231f2937`; 
}

function generateEmailHtml(
  currentStats: Awaited<ReturnType<typeof getWeeklyStats>>,
  prevStats: Awaited<ReturnType<typeof getWeeklyStats>>,
  masteryUpdates: any[],
  aiMessage: string,
  radarChartUrl: string
) {
  const { totalWorkHours, totalQuestions, successRate, totalVideos, questionStats, radarData } = currentStats;
  const formattedTime = formatTime(currentStats.totalWorkSeconds);

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Haftalık Rapor</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body, table, td, div, p, a { font-family: 'Poppins', 'Inter', Helvetica, Arial, sans-serif; }
        body { margin: 0; padding: 0; background-color: #1a1a1a; color: #f3f4f6; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: 'Poppins', 'Inter', Helvetica, Arial, sans-serif;">
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #262626; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); border: 1px solid #374151;">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #1a1a1a; padding: 35px 15px; text-align: center; border-bottom: 1px solid #374151;">
                  <a href="https://auditpath.app" style="text-decoration: none; display: inline-block;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="vertical-align: middle;">
                          <picture>
                            <source srcset="https://ccnvhimlbkkydpcqtraw.supabase.co/storage/v1/object/public/AuditPath/logo.svg" type="image/svg+xml">
                            <img src="https://ccnvhimlbkkydpcqtraw.supabase.co/storage/v1/object/public/AuditPath/logo.png" alt="AuditPath" width="70" height="70" style="display: block; border: 0; outline: none;">
                          </picture>
                        </td>
                        <td style="vertical-align: middle; padding-left: 15px;">
                          <span style="color: #FAECCE; font-size: 32px; font-weight: 800; letter-spacing: 1px; font-family: 'Poppins', sans-serif;">Audit Path</span>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- AI Coach -->
                  <div style="background-color: #134e4a; border: 1px solid #2dd4bf; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                      <div style="display:flex; align-items:start;">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5eead4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 15px; margin-top: 2px; flex-shrink: 0;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M10 13h4"/></svg>
                         <div>
                           <span style="display:block; font-size: 11px; font-weight: 700; color: #5eead4; text-transform: uppercase;">Analiz</span>
                           <p style="margin: 5px 0 0 0; font-size: 15px; line-height: 1.8; color: #e0f2f1; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; letter-spacing: 0.2px;">${aiMessage}</p>
                        </div>
                     </div>
                  </div>

                  <!-- 1. Work Duration & 2. Video Count -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                    <tr>
                      <td width="48%" style="background-color: #262626; padding: 15px; border-radius: 12px; border: 1px solid #4b5563;">
                        <div style="color: #f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; letter-spacing: 0.5px;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Çalışma Süresi
                        </div>
                        <div style="color: #f3f4f6; font-size: 20px; font-weight: 800; margin: 5px 0;">${formattedTime}</div>
                        ${getComparisonBadge(currentStats.totalWorkHours, prevStats.totalWorkHours)}
                      </td>
                      <td width="4%"></td>
                      <td width="48%" style="background-color: #262626; padding: 15px; border-radius: 12px; border: 1px solid #4b5563;">
                        <div style="color: f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; letter-spacing: 0.5px;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 6 4-6 4V8z"/></svg>
                          Tamamlanan Video
                        </div>
                        <div style="color: #f3f4f6; font-size: 20px; font-weight: 800; margin: 5px 0;">${totalVideos}</div>
                         ${getComparisonBadge(currentStats.totalVideos, prevStats.totalVideos)}
                      </td>
                    </tr>
                  </table>

                  <!-- 3. Radar Chart (Lessons) -->
                  <div style="margin-bottom: 30px; text-align: center;">
                       <h3 style="color: #e5e7eb; font-size: 14px; margin: 0 0 12px 0; text-align: left; display: flex; align-items: center; font-weight: 600;">
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5eead4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                         Ders Dağılımı
                       </h3>
                       <img src="${radarChartUrl}" style="width: 100%; max-width: 400px; height: auto; border-radius: 12px; border: 1px solid #374151;" />
                  </div>

                  <!-- 4. Question Stats -->
                  <div style="margin-bottom: 30px;">
                    <h3 style="color: #e5e7eb; font-size: 14px; margin: 0 0 12px 0; display: flex; align-items: center; font-weight: 600;">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5eead4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                       Soru İstatistikleri
                    </h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #262626; border-radius: 12px; border: 1px solid #4b5563; overflow: hidden;">
                        <tr>
                            <td style="padding: 15px; border-bottom: 1px solid #4b5563;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="color: f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; letter-spacing: 0.5px;">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M16 8.9V7H8l4 5-4 5h8v-1.9"/></svg>
                              Toplam Çözülen
                            </div>
                                    <div style="text-align:right;">
                                        <span style="color:#f3f4f6; font-weight:700; font-size:16px;">${totalQuestions}</span>
                                        ${getComparisonBadge(currentStats.totalQuestions, prevStats.totalQuestions)}
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                             <td style="padding: 15px;">
                                <table width="100%">
                                    <tr>
                                        <td width="33.33%" align="center" style="border-right:1px solid #4b5563;">
                                            <div style="color:#5eead4; font-weight:800; font-size:18px;">${questionStats.correct}</div>
                                            <div style="color:f3f4f6; font-size:10px;">DOĞRU</div>
                                        </td>
                                        <td width="33.33%" align="center" style="border-right:1px solid #4b5563;">
                                            <div style="color:#ef4444; font-weight:800; font-size:18px;">${questionStats.incorrect}</div>
                                            <div style="color:f3f4f6; font-size:10px;">YANLIŞ</div>
                                        </td>
                                        <td width="33.33%" align="center">
                                            <div style="color:#fbbf24; font-weight:800; font-size:18px;">${questionStats.blank}</div>
                                            <div style="color:f3f4f6; font-size:10px;">BOŞ</div>
                                        </td>
                                    </tr>
                                </table>
                             </td>
                        </tr>
                    </table>
                  </div>

                  <!-- 8. Comparisons (Success Rate) -->
                  <div style="background-color: #262626; padding: 15px; border-radius: 12px; border: 1px solid #4b5563; display: flex; justify-content: space-between; align-items: center;">
                       <div>
                            <div style="color: f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; letter-spacing: 0.5px;">
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/></svg>
                               Quiz Başarısı
                            </div>
                           <div style="color: #f3f4f6; font-size: 20px; font-weight: 800; margin-top:2px;">%${successRate}</div>
                       </div>
                       <div>
                           ${getComparisonBadge(currentStats.successRate, prevStats.successRate)}
                       </div>
                  </div>

                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #262626; padding: 30px; text-align: center; border-top: 1px solid #374151;">
                   <p style="margin: 0; font-size: 12px; color: #6b7280;">© ${new Date().getFullYear()} AuditPath</p>
                </td>
              </tr>
            </table>
            
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

console.log("Weekly Report Function Initialized");

Deno.serve(async (req: Request) => {
  try {
    // 1. Check for Authorization header (Cron jobs should use Service Role or we can leave it open if we have internal check)
    // For Cron: Supabase passes Auth header.
    // For simple testing: we will just proceed.
    
    // 2. Parse request for optional email override
    let targetEmail = TEST_EMAIL;
    try {
        const body = await req.json();
        if (body.email) targetEmail = body.email;
    } catch {
        // Body might be empty
    }

    if (!targetEmail) {
        return new Response(JSON.stringify({ error: "No target email found" }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    // 3. Setup Clients
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const resend = new Resend(RESEND_API_KEY);
    const openai = OPENAI_API_KEY ? new OpenAI({ 
      apiKey: OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      maxRetries: 5,
    }) : null;

    // 4. Logic
    const { data: user } = await supabase.from('users').select('id').eq('email', targetEmail).single();
    if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), { 
            status: 404, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    const currentStats = await getWeeklyStats(supabase, user.id, 0);
    const prevStats = await getWeeklyStats(supabase, user.id, 1);
    const masteryUpdates = await getMasteryUpdates(supabase, user.id);
    const aiMessage = await generateAIInsight(openai, currentStats, prevStats);
    const radarChartUrl = generateRadarChartUrl(currentStats.radarData);
    
    const html = generateEmailHtml(currentStats, prevStats, masteryUpdates, aiMessage, radarChartUrl);

    // 5. Send Email
    const { data, error } = await resend.emails.send({
        from: 'AuditPath <onboarding@resend.dev>',
        to: [targetEmail],
        subject: `📊 ${currentStats.totalWorkHours} saat çalıştın! Haftalık Raporun`,
        html: html,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err: any) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), { 
          status: 500,
          headers: { "Content-Type": "application/json" } 
      });
  }
})
