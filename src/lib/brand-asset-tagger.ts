// Auto-tag a brand asset using Claude Haiku vision. Returns a short array of
// lowercase kebab-case descriptive tags so we can filter the asset library
// without the user having to hand-tag every upload.
//
// Intentionally lightweight (max ~200 tokens, cheap Haiku call, ~1-2s per
// image). Failures are non-fatal — callers should catch and continue.

import 'server-only';
import { anthropic } from './anthropic';
import type { BrandAssetKind } from './types';

const ALLOWED = /^[a-z0-9][a-z0-9-]{1,22}$/;

const KIND_HINTS: Record<BrandAssetKind, string> = {
  product:
    'Focus on: background color, camera angle (front, 3-4, top-down), composition (isolated, lifestyle, flat-lay), lighting (studio, natural, moody).',
  logo:
    'Focus on: transparency, color palette, style (wordmark, icon, monogram), orientation.',
  reference:
    'Focus on: mood, color palette, subject matter, composition, lighting, era/aesthetic.',
};

export async function autoTagImage(
  imageUrl: string,
  kind: BrandAssetKind,
): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text:
              `Generate 3-6 descriptive tags for this ${kind} image for a wellness brand's ad asset library. ` +
              KIND_HINTS[kind] +
              ' Return ONLY a JSON array of short lowercase kebab-case strings (2-3 words max per tag). ' +
              ' No brand names. No punctuation. Example: ["white-bg","3-4-angle","hero","studio-light"]',
          },
        ],
      },
    ],
  });

  const text = msg.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();

  // Parse JSON array defensively — strip fences, find first [ .. ]
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const first = stripped.indexOf('[');
    const last = stripped.lastIndexOf(']');
    if (first >= 0 && last > first) {
      try {
        parsed = JSON.parse(stripped.slice(first, last + 1));
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.toLowerCase().trim().replace(/\s+/g, '-'))
    .filter((t) => ALLOWED.test(t))
    .slice(0, 8);
}
