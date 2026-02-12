import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('should remove dangerous scripts', () => {
    const dirty = '<div>Hello<script>alert("xss")</script></div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<div>Hello</div>');
  });

  it('should allow basic HTML tags', () => {
    const dirty =
      '<h1>Title</h1><p>Paragraph with <b>bold</b> and <i>italic</i>.</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe(dirty);
  });

  it('should preserve allowed SVG tags and attributes', () => {
    const svg =
      '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';
    const clean = sanitizeHtml(svg);
    // dompurify might normalize attributes or add xmlns, but it should keep the core tags
    expect(clean).toContain('<svg');
    expect(clean).toContain('viewBox="0 0 100 100"');
    expect(clean).toContain('<circle');
    expect(clean).toContain('fill="red"');
  });

  it('should preserve allowed MathML tags', () => {
    const math = '<math><mrow><msup><mi>x</mi><mn>2</mn></msup></mrow></math>';
    const clean = sanitizeHtml(math);
    expect(clean).toContain('<math');
    expect(clean).toContain('<mrow');
    expect(clean).toContain('<msup');
  });

  it('should remove forbidden attributes like onerror', () => {
    const dirty = '<img src="x" onerror="alert(1)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<img src="x">');
  });
});
