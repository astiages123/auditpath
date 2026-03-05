import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

const MODULE = 'MockQuizService';

/**
 * Mikro İktisat dersi için mock soruları veritabanına yükler.
 * Bu işlem idempotenttir (aynı soruları tekrar eklemez).
 */
export async function injectMicroeconomicsMockData(
  userId: string,
  courseId: string,
  chunkId: string
) {
  const FUNC = 'injectMicroeconomicsMockData';
  try {
    // 1. Önce soruların varlığını kontrol et
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('chunk_id', chunkId)
      .eq('usage_type', 'antrenman');

    if (count && count >= 5) {
      console.log(`[${MODULE}] Sorular zaten mevcut (${count} adet).`);
      return { success: true, message: 'Sorular zaten mevcut.' };
    }

    // 2. Mock Sorular
    const mockQuestions = [
      {
        course_id: courseId,
        chunk_id: chunkId,
        created_by: userId,
        section_title: 'Deneme',
        usage_type: 'antrenman' as const,
        bloom_level: 'application' as const,
        concept_title: 'Tüketici Dengesi',
        question_data: {
          type: 'multiple_choice',
          q: 'Bir tüketicinin fayda fonksiyonu $U(x,y) = x^{0.5}y^{0.5}$ şeklindedir. Fiyatlar $P_x=2$, $P_y=2$ ve gelir $I=40$ ise tüketici dengesinde $x$ miktarını kaç birim tüketir?',
          o: ['5', '10', '15', '20'],
          a: 1,
          exp: 'Tüketici dengesi $MRS_{xy} = P_x/P_y$ noktasında oluşur. Fayda fonksiyonundan $MRS = y/x$ bulunur. $y/x = 2/2 \\Rightarrow y=x$. Bütçe kısıtı $2x + 2y = 40 \\Rightarrow 4x=40 \\Rightarrow x=10$.',
        },
      },
      {
        course_id: courseId,
        chunk_id: chunkId,
        created_by: userId,
        section_title: 'Deneme',
        usage_type: 'antrenman' as const,
        bloom_level: 'analysis' as const,
        concept_title: 'Maliyet Analizi',
        question_data: {
          type: 'multiple_choice',
          q: 'Toplam maliyet fonksiyonu $TC = 200 + 2Q^2$ olan bir firmada, $Q=10$ birim üretim düzeyinde Marjinal Maliyet (MC) kaçtır?',
          o: ['20', '40', '60', '80'],
          a: 1,
          exp: 'Marjinal Maliyet, Toplam Maliyet fonksiyonunun türevidir. $MC = d(TC)/dQ = d(200 + 2Q^2)/dQ = 4Q$. $Q=10$ için $MC = 4 \\times 10 = 40$.',
        },
      },
      {
        course_id: courseId,
        chunk_id: chunkId,
        created_by: userId,
        section_title: 'Deneme',
        usage_type: 'antrenman' as const,
        bloom_level: 'application' as const,
        concept_title: 'Esneklik',
        question_data: {
          type: 'multiple_choice',
          q: 'Talep fonksiyonu $Q_d = 100 - 2P$ olarak verilmiştir. Fiyat $P=20$ olduğunda talebin fiyat esnekliğinin mutlak değeri kaçtır?',
          o: ['0.5', '0.66', '1.0', '1.5'],
          a: 1,
          exp: 'Esneklik formülü $\\epsilon = (dQ/dP) \\times (P/Q)$. $dQ/dP = -2$. $P=20$ için $Q = 100 - 2(20) = 60$. $\\epsilon = -2 \\times (20/60) = -40/60 = -0.66$. Mutlak değer 0.66.',
        },
      },
      {
        course_id: courseId,
        chunk_id: chunkId,
        created_by: userId,
        section_title: 'Deneme',
        usage_type: 'antrenman' as const,
        bloom_level: 'analysis' as const,
        concept_title: 'Üretim Teorisi',
        question_data: {
          type: 'multiple_choice',
          q: 'Bir üretim fonksiyonu $Q = 10L^{0.5}K^{0.5}$ şeklindedir. Bu fonksiyon için ölçeğe göre getiri durumu nedir?',
          o: [
            'Artan Getiri',
            'Azalan Getiri',
            'Sabit Getiri',
            'Negatif Getiri',
          ],
          a: 2,
          exp: 'Cobb-Douglas üretim fonksiyonunda üsler toplamı ($\\alpha + \\beta$) getiri durumunu belirler. $0.5 + 0.5 = 1$ olduğu için Sabit Getiri söz konusudur.',
        },
      },
      {
        course_id: courseId,
        chunk_id: chunkId,
        created_by: userId,
        section_title: 'Deneme',
        usage_type: 'antrenman' as const,
        bloom_level: 'application' as const,
        concept_title: 'Piyasa Dengesi',
        question_data: {
          type: 'multiple_choice',
          q: 'Bir piyasada talep $Q_d = 100 - P$ ve arz $Q_s = 20 + P$ şeklindedir. Denge fiyatı ($P^*$) kaçtır?',
          o: ['30', '40', '50', '60'],
          a: 1,
          exp: 'Dengede $Q_d = Q_s$ olur. $100 - P = 20 + P \\Rightarrow 2P = 80 \\Rightarrow P = 40$.',
        },
      },
    ];

    const { error } = await supabase.from('questions').insert(mockQuestions);
    if (error) throw error;

    return { success: true, message: 'Mock veriler başarıyla yüklendi.' };
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
}
