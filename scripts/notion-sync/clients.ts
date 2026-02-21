import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { createClient } from '@supabase/supabase-js';

import {
  NOTION_TOKEN,
  SUPABASE_SERVICE_KEY,
  SUPABASE_URL,
  validateConfig,
} from './config';
import type {
  Database,
  RichTextItemResponse,
  BlockObjectResponse,
} from './types';

type BlockWithChildren = BlockObjectResponse & {
  children?: BlockObjectResponse[];
};

validateConfig();

export const notion = new Client({ auth: NOTION_TOKEN });
export const supabase = createClient<Database>(
  SUPABASE_URL as string,
  SUPABASE_SERVICE_KEY as string
);
export const n2m = new NotionToMarkdown({ notionClient: notion });

export async function setupCalloutTransformer(): Promise<void> {
  n2m.setCustomTransformer(
    'callout',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (block: any) => {
      const callout = block.callout;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mdResult = await n2m.blockToMarkdown(tempBlock as any);
        titleContent =
          typeof mdResult === 'string'
            ? mdResult
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (mdResult as any).parent || '';
      } catch {
        titleContent = callout.rich_text
          .map((t: RichTextItemResponse) => t.plain_text)
          .join('');
      }

      let childrenContent = '';
      if (block.has_children) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const children = (block as any).children;
        if (children && children.length > 0) {
          const mdBlocks = await n2m.blocksToMarkdown(children);
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

      return combined
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    }
  );
}

import pLimit from 'p-limit';
const blockLimit = pLimit(10);

export async function getBlocksWithChildren(
  blockId: string
): Promise<BlockObjectResponse[]> {
  const response = await notion.blocks.children.list({ block_id: blockId });
  const blocks = response.results as BlockObjectResponse[];

  const childPromises = blocks.map((block) => {
    const blockWithChildren = block as BlockWithChildren;
    if (blockWithChildren.has_children) {
      return blockLimit(async () => {
        blockWithChildren.children = await getBlocksWithChildren(block.id);
      });
    }
    return Promise.resolve();
  });

  await Promise.all(childPromises);
  return blocks;
}
