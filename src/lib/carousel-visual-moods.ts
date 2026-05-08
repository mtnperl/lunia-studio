// Per-carousel "visual mood" library used by carousel-v2 to break out of
// the locked dark-blue editorial look that v1 hardcodes. Each mood ships
// a distinct style block that gets appended to the fal prompt — so the
// same Claude-written subject can render five very different ways.

export type VisualMood = {
  id: string;
  label: string;
  /** Appended to the fal prompt to override style direction. */
  styleBlock: string;
};

export const VISUAL_MOODS: VisualMood[] = [
  {
    id: "cinematic-dark",
    label: "Cinematic Dark",
    styleBlock:
      "cinematic editorial photography, deep midnight blue and charcoal palette, dramatic chiaroscuro lighting with selective highlights, ultra-sharp detail, premium wellness aesthetic, no text, no logos",
  },
  {
    id: "minimalist-light",
    label: "Minimalist Light",
    styleBlock:
      "minimalist Scandinavian aesthetic, bright airy composition, soft pastel palette of cream / oat / dusty rose, generous negative space, gentle diffused natural daylight, premium clean editorial, no text, no logos",
  },
  {
    id: "vibrant-editorial",
    label: "Vibrant Editorial",
    styleBlock:
      "bold magazine-cover styling, saturated jewel-tone palette (deep emerald, burnt orange, ultramarine), high contrast, confident centered composition, glossy print finish, premium fashion-editorial aesthetic, no text, no logos",
  },
  {
    id: "surreal-abstract",
    label: "Surreal Abstract",
    styleBlock:
      "surreal conceptual still life, unexpected juxtaposition, dreamlike soft-focus abstraction, ethereal gradients in lavender / peach / sage, otherworldly atmosphere, contemporary art-direction, no text, no logos",
  },
  {
    id: "organic-natural",
    label: "Organic Natural",
    styleBlock:
      "organic natural textures (linen, wood grain, stone, botanical detail), warm earth tones with golden-hour lighting, matte natural materials, calm grounded wellness aesthetic, slight film grain, no text, no logos",
  },
];

export function pickRandomMood(seed?: string): VisualMood {
  // If a seed is provided, deterministic by seed (so a regenerate with the
  // same topic + slide can reuse the mood). Otherwise, pure random.
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return VISUAL_MOODS[Math.abs(h) % VISUAL_MOODS.length];
  }
  return VISUAL_MOODS[Math.floor(Math.random() * VISUAL_MOODS.length)];
}

export function getMoodById(id: string | undefined | null): VisualMood | undefined {
  if (!id) return undefined;
  return VISUAL_MOODS.find((m) => m.id === id);
}
