import { test } from 'vitest';
import { generateQuizQuestionFromContent } from '../lib/ai/quiz-api';

test('Demo Quiz Generation with Mapper', async () => {
    const sampleText = `
    Ders: Anayasa Hukuku
    Konu: Temel Hak ve Hürriyetler

    Temel hak ve hürriyetler, kişinin doğuştan sahip olduğu, dokunulmaz ve devredilmez haklardır.
    1982 Anayasası'na göre, temel hak ve hürriyetler, özlerine dokunulmaksızın yalnızca Anayasanın
    ilgili maddelerinde belirtilen sebeplere bağlı olarak ve ancak kanunla sınırlanabilir.
    Bu sınırlamalar, Anayasanın sözüne ve ruhuna, demokratik toplum düzeninin ve
    laik Cumhuriyetin gereklerine ve ölçülülük ilkesine aykırı olamaz.

    Olağanüstü hallerde (savaş, seferberlik vb.) ise durum farklıdır. Milletlerarası hukuktan doğan
    yükümlülükler ihlal edilmemek kaydıyla, durumun gerektirdiği ölçüde temel hak ve hürriyetlerin
    kullanılması kısmen veya tamamen durdurulabilir veya bunlar için Anayasada öngörülen güvencelere
    aykırı tedbirler alınabilir. Ancak bu durumda bile kişinin yaşama hakkına, maddi ve manevi
    varlığının bütünlüğüne dokunulamaz (savaş hukukuna uygun fiiller sonucu meydana gelen ölümler dışında).
    Ayrıca, kimse din, vicdan, düşünce ve kanaatlerini açıklamaya zorlanamaz ve bunlardan dolayı suçlanamaz;
    suç ve cezalar geçmişe yürütülemez; suçluluğu mahkeme kararı ile saptan (masumiyet karinesi).
    `;
    
    console.log('\n\n🚀 --- STARTING QUIZ GENERATION DEMO --- 🚀');
    console.log(`Word Count: ${sampleText.trim().split(/\s+/).length}`);
    
    const startTime = Date.now();
    const result = await generateQuizQuestionFromContent(
        'Anayasa Hukuku', 
        'Demo Section', 
        sampleText.trim()
    );
    const endTime = Date.now();
    
    console.log('\n--- GENERATION RESULT ---');
    if (result.success && result.question) {
        console.log('✅ Success!');
        console.log(`⏱️  Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
        console.log('---------------------------------------------------');
        console.log(`Question: ${result.question.q}`);
        console.log('---------------------------------------------------');
        result.question.o.forEach((opt, i) => {
            const label = ['A', 'B', 'C', 'D', 'E'][i];
            const isCorrect = i === result.question!.a;
            console.log(`${label}) ${opt} ${isCorrect ? '✅ (Correct Answer)' : ''}`);
        });
        console.log('---------------------------------------------------');
        console.log(`Explanation: ${result.question.exp}`);
    } else {
        console.error('❌ Failed:', result.error);
    }
    console.log('---------------------------------------------------\n');
}, 60000);
