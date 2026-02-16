/**
 * Storage Sanitizer
 *
 * XSS protection logic using DOMPurify for stored content.
 */

import DOMPurify from "dompurify";

/**
 * Content type for sanitization strategy
 */
export type ContentType = "strict" | "markdown" | "raw";

/**
 * DOMPurify configuration for STRICT sanitization
 * Removes ALL HTML tags - suitable for plain text data
 */
export const STRICT_CONFIG = {
    USE_PROFILES: { html: false },
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true,
    FORBID_TAGS: [
        "script",
        "style",
        "iframe",
        "form",
        "object",
        "embed",
        "link",
    ],
    FORBID_ATTR: [
        "onerror",
        "onload",
        "onclick",
        "onmouseover",
        "onmouseout",
        "onmousedown",
        "onmouseup",
        "onmousemove",
        "onkeypress",
        "onkeydown",
        "onkeyup",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "onreset",
        "onselect",
    ],
};

/**
 * DOMPurify configuration for MARKDOWN content
 * Allows safe HTML tags that are commonly used in Markdown
 */
export const MARKDOWN_CONFIG = {
    ALLOWED_TAGS: [
        // Text formatting
        "b",
        "strong",
        "i",
        "em",
        "u",
        "mark",
        "small",
        "del",
        "ins",
        "sub",
        "sup",
        // Headings
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        // Lists
        "ul",
        "ol",
        "li",
        "dl",
        "dt",
        "dd",
        // Links
        "a",
        // Code
        "code",
        "pre",
        "kbd",
        "samp",
        // Tables
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "td",
        "th",
        "caption",
        "colgroup",
        "col",
        // Block elements
        "blockquote",
        "p",
        "br",
        "hr",
        "div",
        "span",
        // Media
        "img",
        "figure",
        "figcaption",
        // Details/Summary
        "details",
        "summary",
        // SVG for Mermaid
        "svg",
        "path",
        "rect",
        "circle",
        "line",
        "polyline",
        "polygon",
        "text",
        "g",
        "defs",
        "marker",
        "use",
        "foreignObject",
    ],
    ALLOWED_ATTR: [
        // General attributes
        "class",
        "id",
        "title",
        "dir",
        "lang",
        "role",
        "aria-label",
        "aria-hidden",
        // Link attributes
        "href",
        "target",
        "rel",
        // Image attributes
        "src",
        "alt",
        "width",
        "height",
        "loading",
        // Table attributes
        "colspan",
        "rowspan",
        "scope",
        // Code attributes
        "data-language",
        "class", // for syntax highlighting
        // SVG attributes
        "viewBox",
        "d",
        "fill",
        "stroke",
        "stroke-width",
        "transform",
        "cx",
        "cy",
        "r",
        "x",
        "y",
        "points",
        "marker-end",
        "marker-start",
        "xmlns",
        "xmlns:xlink",
        "preserveAspectRatio",
    ],
    FORBID_TAGS: [
        "script",
        "style",
        "iframe",
        "form",
        "object",
        "embed",
        "link",
        "meta",
        "head",
    ],
    FORBID_ATTR: [
        "onerror",
        "onload",
        "onclick",
        "onmouseover",
        "onmouseout",
        "onmousedown",
        "onmouseup",
        "onmousemove",
        "onkeypress",
        "onkeydown",
        "onkeyup",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "onreset",
        "onselect",
    ],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
    // Only allow safe URL protocols
    ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

/**
 * Sanitizes a string value using DOMPurify
 * @param value - The string to sanitize
 * @param contentType - The sanitization strategy to use
 */
export function sanitizeString(
    value: string,
    contentType: ContentType = "strict",
): string {
    if (typeof value !== "string") return value;

    if (contentType === "raw") {
        return value;
    }

    const config = contentType === "markdown" ? MARKDOWN_CONFIG : STRICT_CONFIG;
    return DOMPurify.sanitize(value, config);
}

/**
 * Deep sanitizes an object using DOMPurify
 * @param obj - The object to sanitize
 * @param contentType - The sanitization strategy to use
 */
export function deepSanitize<T>(
    obj: T,
    contentType: ContentType = "strict",
): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === "string") {
        return sanitizeString(obj, contentType) as T;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => deepSanitize(item, contentType)) as T;
    }

    if (typeof obj === "object") {
        const sanitized: Record<string, unknown> = {};
        for (
            const [key, value] of Object.entries(obj as Record<string, unknown>)
        ) {
            sanitized[key] = deepSanitize(value, contentType);
        }
        return sanitized as T;
    }

    return obj;
}
