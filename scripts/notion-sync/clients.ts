import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { createClient } from '@supabase/supabase-js';

import {
  NOTION_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  validateConfig,
} from './config';
import type { Database, RichTextItemResponse } from './types';

validateConfig();

export const notion = new Client({ auth: NOTION_TOKEN });
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);
export const n2m = new NotionToMarkdown({ notionClient: notion });

export function setupCalloutTransformer(): void {
  n2m.setCustomTransformer('callout', async (block) => {
    const { id, has_children } = block as { id: string; has_children: boolean };
    const { callout } = block as {
      callout: {
        icon: {
          type: string;
          emoji?: string;
          external?: { url: string };
        } | null;
        rich_text: RichTextItemResponse[];
      };
    };
    if (!callout || !callout.rich_text) return false;

    let icon = '';
    if (callout.icon) {
      if (callout.icon.type === 'emoji') {
        icon = callout.icon.emoji || '';
      }
    }

    let titleContent = '';
    try {
      const tempBlock = {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: callout.rich_text },
      };
      const mdResult = await n2m.blockToMarkdown(
        tempBlock as Parameters<typeof n2m.blockToMarkdown>[0]
      );

      if (typeof mdResult === 'string') {
        titleContent = mdResult;
      } else if (
        mdResult &&
        typeof mdResult === 'object' &&
        'parent' in mdResult
      ) {
        titleContent = (mdResult as { parent: string }).parent;
      } else {
        const strObj = n2m.toMarkdownString(
          mdResult as Parameters<typeof n2m.toMarkdownString>[0]
        );
        titleContent = typeof strObj === 'string' ? strObj : strObj.parent;
      }
    } catch {
      titleContent = callout.rich_text
        .map((t: RichTextItemResponse) => t.plain_text)
        .join('');
    }

    let childrenContent = '';
    if (has_children) {
      let children = (block as { children?: Record<string, unknown>[] })
        .children;
      if (!children || children.length === 0) {
        try {
          const response = await notion.blocks.children.list({ block_id: id });
          children = response.results as Record<string, unknown>[];
        } catch (err) {
          console.error(`Error fetching children for callout ${id}:`, err);
        }
      }

      if (children && children.length > 0) {
        const mdBlocks = await n2m.blocksToMarkdown(
          children as Parameters<typeof n2m.blocksToMarkdown>[0]
        );
        const mdStringObj = n2m.toMarkdownString(mdBlocks);
        childrenContent =
          typeof mdStringObj === 'string' ? mdStringObj : mdStringObj.parent;
      }
    }

    const trimmedTitle = titleContent.trim();
    const firstPart = icon ? `${icon} ${trimmedTitle}` : trimmedTitle;
    let combined = firstPart;

    if (childrenContent) {
      combined += `\n${childrenContent}`;
    }

    const formatted = combined
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');

    return formatted;
  });
}
