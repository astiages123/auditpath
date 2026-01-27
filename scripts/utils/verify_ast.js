
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

const markdownRaw = `
- **Bütçe Denklemi (Bütçe Kısıtı):** Tüketicinin X ve Y mallarına harcadığı tutarların toplamı, toplam gelirine eşit olmalıdır.

> $$M = \left( P_{x} \cdot X \right) + \left( P_{y} \cdot Y \right)$$

- $M$: Tüketicinin bütçesi / geliri.
`;

// Simulate NoteViewer pre-processing
let newContent = markdownRaw;
newContent = newContent.replace(/(?:^|\n)((?:> ?)+)\$\$([\s\S]+?)\$\$/gm, (match, prefix, inner) => {
    const cleanInner = inner
        .split('\n')
        .map((line) => line.replace(/^(?:> ?)+/, ''))
        .join('\n')
        .trim();
    return `\n\n$$\n${cleanInner}\n$$\n\n`;
});

// Also the block math replacement for turkish chars (simplified for test)
newContent = newContent.replace(/(?:^|\n)\s*\$\$([\s\S]+?)\$\$/g, (match, math) => {
    return `\n\n$$${math.trim()}$$\n\n`;
});

console.log("--- Processed Markdown ---");
console.log(newContent);
console.log("--------------------------");

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath);

const tree = processor.parse(newContent);
// Log detailed structure of the list items
console.log(JSON.stringify(tree, null, 2));
