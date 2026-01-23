import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { Database } from '../src/lib/types/supabase.js';
import OpenAI from 'openai';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OPENAI_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error('Missing required environment variables (SUPABASE, RESEND).');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const resend = new Resend(RESEND_API_KEY);
const openai = OPENAI_API_KEY ? new OpenAI({ 
  apiKey: OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
}) : null;

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

async function getWeeklyStats(userId: string, weeksAgo: number) {
  const { start, end } = getDates(weeksAgo);

  // 1. Pomodoro & Radar Data
  const { data: sessions } = await supabase
    .from('pomodoro_sessions')
    .select('total_work_time, course_name')
    .eq('user_id', userId)
    .gt('created_at', start)
    .lte('created_at', end);
  
  const totalWorkSeconds = sessions?.reduce((acc, curr) => acc + (curr.total_work_time || 0), 0) || 0;
  const totalWorkHours = Number((totalWorkSeconds / 60 / 60).toFixed(1));

  // Radar Data (Group by course)
  const courseDist: Record<string, number> = {};
  sessions?.forEach(s => {
      const name = s.course_name || 'Diğer';
      courseDist[name] = (courseDist[name] || 0) + (s.total_work_time || 0);
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
  const correctCount = quizProgress?.filter(q => q.response_type === 'correct').length || 0;
  const incorrectCount = quizProgress?.filter(q => q.response_type === 'incorrect').length || 0;
  const blankCount = quizProgress?.filter(q => q.response_type === 'blank').length || 0;
  
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

async function getMasteryUpdates(userId: string) {
    const { start } = getDates(0);
    
    // Fetch recent mastery updates
    const { data: masteryRaw } = await supabase
      .from('chunk_mastery')
      .select('chunk_id, mastery_score, updated_at')
      .eq('user_id', userId)
      .gt('updated_at', start)
      .order('updated_at', { ascending: false })
      .limit(3);

    if (!masteryRaw || masteryRaw.length === 0) return [];

    const chunkIds = masteryRaw.map(m => m.chunk_id);
    const { data: chunks } = await supabase.from('note_chunks').select('id, section_title').in('id', chunkIds);

    return masteryRaw.map(m => ({
        ...m,
        title: chunks?.find(c => c.id === m.chunk_id)?.section_title || 'Bilinmeyen Konu'
    }));
}

async function generateAIInsight(current: { totalWorkHours: number; totalQuestions: number; successRate: number }, previous: { totalWorkHours: number; totalQuestions: number; successRate: number }) {
  if (!openai) return "Harika bir hafta geçirdin! İstikrarını korumaya devam et. 🚀";

  const prompt = `
    Aşağıdaki öğrenci verilerine göre haftalık kısa (max 2 cümle), motive edici ve kişisel bir koçluk yorumu yaz.
    Sen arkadaş canlısı bir yapay zeka koçusun.
    
    Bu Hafta: ${current.totalWorkHours} saat çalışma, ${current.totalQuestions} soru, %${current.successRate} başarı.
    Geçen Hafta: ${previous.totalWorkHours} saat çalışma, ${previous.totalQuestions} soru, %${previous.successRate} başarı.
    
    Eğer gelişme varsa öv, düşüş varsa nazikçe teşvik et.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "mistralai/devstral-2512:free", 
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
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

function getComparisonBadge(current: number, previous: number) {
    const diff = current - previous;
    const isPositive = diff > 0;
    const isZero = diff === 0;
    const color = isPositive ? '#10b981' : isZero ? '#9ca3af' : '#ef4444'; // Green, Gray, Red
    const icon = isPositive ? '↑' : isZero ? '-' : '↓';
    const val = isZero ? 'Değişim Yok' : `%${Math.abs(Math.round((diff / (previous || 1)) * 100))} ${icon}`;
    
    return `<span style="color: ${color}; font-size: 12px; font-weight: 700; background: ${color}15; padding: 2px 8px; border-radius: 99px;">${val}</span>`;
}

function generateEmailHtml(
  currentStats: Awaited<ReturnType<typeof getWeeklyStats>>,
  prevStats: Awaited<ReturnType<typeof getWeeklyStats>>,
  masteryUpdates: Array<{ chunk_id: string; mastery_score: number; updated_at: string | null; title: string }>,
  aiMessage: string,
  radarChartUrl: string
) {
  const { totalQuestions, successRate, totalVideos, questionStats } = currentStats;
  const formattedTime = formatTime(currentStats.totalWorkSeconds);

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Haftalık Rapor</title>
      <style>
        body, table, td, div, p, a { font-family: 'Inter', Helvetica, Arial, sans-serif; }
        body { margin: 0; padding: 0; background-color: #111827; color: #f3f4f6; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #111827; font-family: 'Inter', Helvetica, Arial, sans-serif;">
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #111827;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); border: 1px solid #374151;">
              
              <!-- Header with Logo -->
              <tr>
                <td style="background-color: #7c3aed; padding: 30px; text-align: center;">
                  <img src="https://auditpath.app/logo.png" alt="AuditPath" style="height: 40px; display: block; margin: 0 auto 10px auto;" /> 
                  <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">Haftalık Gelişim Raporu</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- AI Coach -->
                  <div style="background-color: #312e81; border: 1px solid #4338ca; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                     <div style="display:flex; align-items:start;">
                        <span style="font-size: 24px; margin-right: 15px;">🤖</span>
                        <div>
                           <span style="display:block; font-size: 11px; font-weight: 700; color: #a5b4fc; text-transform: uppercase;">Yorum</span>
                           <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 1.5; color: #e0e7ff; font-style: italic;">"${aiMessage}"</p>
                        </div>
                     </div>
                  </div>

                  <!-- 1. Work Duration & 2. Video Count -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                    <tr>
                      <td width="48%" style="background-color: #374151; padding: 15px; border-radius: 12px; border: 1px solid #4b5563;">
                        <div style="color: #9ca3af; font-size: 12px; font-weight: 600; text-transform: uppercase;">Çalışma Süresi</div>
                        <div style="color: #f3f4f6; font-size: 20px; font-weight: 800; margin: 5px 0;">${formattedTime}</div>
                        ${getComparisonBadge(currentStats.totalWorkHours, prevStats.totalWorkHours)}
                      </td>
                      <td width="4%"></td>
                      <td width="48%" style="background-color: #374151; padding: 15px; border-radius: 12px; border: 1px solid #4b5563;">
                        <div style="color: #9ca3af; font-size: 12px; font-weight: 600; text-transform: uppercase;">Tamamlanan Video</div>
                        <div style="color: #f3f4f6; font-size: 20px; font-weight: 800; margin: 5px 0;">${totalVideos}</div>
                         ${getComparisonBadge(currentStats.totalVideos, prevStats.totalVideos)}
                      </td>
                    </tr>
                  </table>

                  <!-- 3. Radar Chart (Lessons) -->
                  <div style="margin-bottom: 30px; text-align: center;">
                       <h3 style="color: #e5e7eb; font-size: 15px; margin: 0 0 10px 0; text-align: left;">🕸️ Ders Dağılımı</h3>
                       <img src="${radarChartUrl}" style="width: 100%; max-width: 400px; height: auto; border-radius: 12px; border: 1px solid #374151;" />
                  </div>

                  <!-- 4. Question Stats -->
                  <div style="margin-bottom: 30px;">
                    <h3 style="color: #e5e7eb; font-size: 15px; margin: 0 0 10px 0;">🎯 Soru İstatistikleri</h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #374151; border-radius: 12px; border: 1px solid #4b5563; overflow: hidden;">
                        <tr>
                            <td style="padding: 15px; border-bottom: 1px solid #4b5563;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:#d1d5db; font-size:14px;">Toplam Çözülen</span>
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
                                        <td align="center" style="border-right:1px solid #4b5563;">
                                            <div style="color:#10b981; font-weight:800; font-size:18px;">${questionStats.correct}</div>
                                            <div style="color:#9ca3af; font-size:10px;">DOĞRU</div>
                                        </td>
                                        <td align="center" style="border-right:1px solid #4b5563;">
                                            <div style="color:#ef4444; font-weight:800; font-size:18px;">${questionStats.incorrect}</div>
                                            <div style="color:#9ca3af; font-size:10px;">YANLIŞ</div>
                                        </td>
                                        <td align="center">
                                            <div style="color:#fbbf24; font-weight:800; font-size:18px;">${questionStats.blank}</div>
                                            <div style="color:#9ca3af; font-size:10px;">BOŞ</div>
                                        </td>
                                    </tr>
                                </table>
                             </td>
                        </tr>
                    </table>
                  </div>

                  <!-- 8. Comparisons (Success Rate) -->
                  <div style="background-color: #374151; padding: 15px; border-radius: 12px; border: 1px solid #4b5563; display: flex; justify-content: space-between; align-items: center;">
                       <div>
                           <div style="color: #9ca3af; font-size: 12px; font-weight: 600; text-transform: uppercase;">Quiz Başarısı</div>
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
                <td style="background-color: #1f2937; padding: 30px; text-align: center; border-top: 1px solid #374151;">
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
/** @deprecated unused */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateTrend(_current: number, _previous: number) {
    if (_previous === 0) return _current > 0 ? '+∞%' : '0%';
    const diff = ((_current - _previous) / _previous) * 100;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${Math.round(diff)}%`;
}

async function main() {
    try {
        const targetEmail = TEST_EMAIL;
        if (!targetEmail) throw new Error("TEST_EMAIL env variable missing");

        // Get User ID
        const { data: user } = await supabase.from('users').select('id').eq('email', targetEmail).single();
        if (!user) throw new Error("User not found");
        console.log(`Generating v2 report for ${targetEmail}...`);

        // Fetch Stats
        const currentStats = await getWeeklyStats(user.id, 0);
        const prevStats = await getWeeklyStats(user.id, 1);
        const masteryUpdates = await getMasteryUpdates(user.id);
        
        // AI & Chart
        const aiMessage = await generateAIInsight(currentStats, prevStats);
        // const chartUrl = generateChartUrl(currentStats, prevStats); // Old Bar Chart
        const radarChartUrl = generateRadarChartUrl(currentStats.radarData);

        // HTML Template (Premium Design)
        const html = generateEmailHtml(currentStats, prevStats, masteryUpdates, aiMessage, radarChartUrl);

        // Send Email
        const { data, error } = await resend.emails.send({
            from: 'AuditPath <onboarding@resend.dev>',
            to: [targetEmail],
            subject: `📊 ${currentStats.totalWorkHours} saat çalıştın! Haftalık Raporun`,
            html: html,
        });

        if (error) throw error;
        console.log('✅ Email sent:', data);

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

main();
