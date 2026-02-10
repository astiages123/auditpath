import DOMPurify from 'dompurify';

/**
 * Sanitize HTML/SVG content to prevent XSS attacks.
 * Configured to support Mermaid SVG and KaTeX math formulas.
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    ADD_TAGS: [
      'use',
      'foreignObject',
      'math',
      'semantics',
      'annotation',
      'mrow',
      'msup',
      'msub',
      'msubsup',
      'mover',
      'munder',
      'munderover',
      'mfrac',
      'msqrt',
      'mroot',
      'mi',
      'mo',
      'mn',
    ],
    ADD_ATTR: [
      'cx',
      'cy',
      'r',
      'fill',
      'stroke',
      'stroke-width',
      'd',
      'points',
      'viewBox',
      'width',
      'height',
      'x',
      'y',
      'role',
      'aria-hidden',
      'id',
      'class',
      'transform',
      'style',
      'xlink:href',
    ],
  });
};
