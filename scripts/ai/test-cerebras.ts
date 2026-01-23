import 'dotenv/config';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

const cerebras = new Cerebras({
  apiKey: process.env['CEREBRAS_API_KEY']
});

async function main() {
  console.log('Testing Cerebras SDK...');
  try {
    const completion = await cerebras.chat.completions.create({
      messages: [{"role":"user","content":"Why is fast inference important?"}],
      model: 'llama-3.3-70b',
      max_completion_tokens: 1024,
      temperature: 0.2,
      top_p: 1,
      stream: false
    });

    console.log('\n--- Response ---');
    console.log(completion.choices[0].message.content);
    console.log('----------------');
  } catch (err) {
    console.error('Error connecting to Cerebras:', err);
  }
}

main();
