/**
 * Cleans and prepares math content for KaTeX rendering.
 * Handles image patterns, number formatting, and escaping LaTeX special characters like '%'.
 */
export const cleanMathContent = (
  content: string | undefined | null
): string => {
  if (!content) return '';

  return (
    content
      // 1. Remove image markdown patterns (e.g., (image.webp))
      .replace(/\([\w-]+\.(webp|png|jpg|jpeg|gif)\)/gi, '')
      // 2. Remove [GÖRSEL: X] patterns
      .replace(/\[GÖRSEL:\s*\d+\]/gi, '')
      // 3. Normalize newlines
      .replace(/\n\s*\n/g, '\n\n')
      // 4. Format numbers:
      // a. Remove spaces between digits (e.g., 1 000 000 -> 1000000)
      .replace(/(\d)\s+(?=\d)/g, '$1')
      // b. Add dots for thousands (e.g., 1000000 -> 1.000.000)
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      // 5. Escape percentage signs '%' that are not already escaped '\%'
      // This prevents KaTeX from treating '%' as a comment.
      // We look for '%' that is not preceded by '\'.
      .replace(/(?<!\\)%/g, '\\%')
      .trim()
  );
};

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * Provides unbiased randomization.
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
