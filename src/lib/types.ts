export type Comment = {
  author: string;
  text: string;
  time: string;
};

export type FilmingNotes = {
  setting: string;
  energy: string;
  broll: string;
  director: string;
};

export type Script = {
  id: string;
  title: string;
  hook: string;
  lines: string[];
  comments: Record<number, Comment[]>;
  filmingNotes: Record<number, Partial<FilmingNotes>>;
  creator: string;
  status: "draft" | "review" | "locked";
  persona: string;
  angle: string;
  format: string;
  savedAt: string;
};

// ─── Carousel types ───────────────────────────────────────────────────────────
export type HookTone =
  | "educational"
  | "clickbait"
  | "curiosity"
  | "myth-bust"
  | "science-backed"
  | "personal-story";
export type Topic = {
  title: string;
  description: string;
  pillar: string;
};

export type Hook = {
  headline: string;
  subline: string;
};

export type CarouselContentSlide = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string; // GraphicSpec JSON string (new) or raw SVG string (legacy)
};

// ─── GraphicSpec — curated infographic component selection ────────────────────
import { z } from 'zod';

const versusItem = z.object({ label: z.string(), value: z.string(), note: z.string().optional() });

export const GraphicSpecSchema = z.discriminatedUnion('component', [
  // ── Existing ──────────────────────────────────────────────────────────────
  z.object({
    component: z.literal('stat'),
    data: z.object({ stat: z.string(), label: z.string(), unit: z.string().optional() }),
  }),
  z.object({
    component: z.literal('bars'),
    data: z.object({ items: z.array(z.object({ label: z.string(), value: z.string() })).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('steps'),
    data: z.object({ steps: z.array(z.string()).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('dotchain'),
    data: z.object({ labels: z.array(z.string()).min(1).max(2) }),
  }),
  z.object({
    component: z.literal('wave'),
    data: z.object({}),
  }),
  z.object({
    component: z.literal('iconGrid'),
    data: z.object({ items: z.array(z.object({ label: z.string() })).min(1).max(4) }),
  }),
  // ── New ───────────────────────────────────────────────────────────────────
  z.object({
    component: z.literal('donut'),
    data: z.object({ value: z.string(), label: z.string(), sublabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('versus'),
    data: z.object({ left: versusItem, right: versusItem }),
  }),
  z.object({
    component: z.literal('timeline'),
    data: z.object({ events: z.array(z.object({ time: z.string(), label: z.string() })).min(2).max(6) }),
  }),
  z.object({
    component: z.literal('split'),
    data: z.object({ parts: z.array(z.object({ label: z.string(), percent: z.number(), value: z.string().optional() })).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('checklist'),
    data: z.object({ items: z.array(z.string()).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('callout'),
    data: z.object({ text: z.string(), source: z.string().optional() }),
  }),
  z.object({
    component: z.literal('table'),
    data: z.object({
      headers: z.array(z.string()).min(2).max(4),
      rows: z.array(z.array(z.string())).min(1).max(5),
    }),
  }),
  z.object({
    component: z.literal('pyramid'),
    data: z.object({ levels: z.array(z.string()).min(2).max(5) }),
  }),
  // ── New (Tier 1) ──────────────────────────────────────────────────────────
  z.object({
    component: z.literal('radial'),
    data: z.object({ value: z.string(), label: z.string(), sublabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('circleStats'),
    data: z.object({ items: z.array(z.object({ value: z.string(), label: z.string(), sublabel: z.string().optional() })).min(2).max(4) }),
  }),
  z.object({
    component: z.literal('spectrum'),
    data: z.object({ min: z.number(), max: z.number(), from: z.number(), to: z.number(), label: z.string(), unit: z.string().optional() }),
  }),
  z.object({
    component: z.literal('funnel'),
    data: z.object({ stages: z.array(z.object({ label: z.string(), value: z.string().optional(), percent: z.number().optional() })).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('scorecard'),
    data: z.object({ score: z.string(), label: z.string(), sublabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('bubbles'),
    data: z.object({ items: z.array(z.object({ label: z.string(), size: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), sublabel: z.string().optional() })).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('iconStat'),
    data: z.object({ icon: z.string(), value: z.string(), unit: z.string().optional(), label: z.string(), sublabel: z.string().optional() }),
  }),
  // ── New (Tier 2) ──────────────────────────────────────────────────────────
  z.object({
    component: z.literal('matrix2x2'),
    data: z.object({ topLeft: z.string(), topRight: z.string(), bottomLeft: z.string(), bottomRight: z.string(), xLabel: z.string().optional(), yLabel: z.string().optional() }),
  }),
  z.object({
    component: z.literal('stackedBar'),
    data: z.object({ segments: z.array(z.object({ label: z.string(), percent: z.number(), value: z.string().optional() })).min(2).max(5), title: z.string().optional() }),
  }),
  z.object({
    component: z.literal('processFlow'),
    data: z.object({ steps: z.array(z.string()).min(2).max(5) }),
  }),
  z.object({
    component: z.literal('heatGrid'),
    data: z.object({ cells: z.array(z.object({ label: z.string(), value: z.number().int().min(1).max(3) })).min(2).max(12), title: z.string().optional() }),
  }),
  z.object({
    component: z.literal('vector'),
    data: z.object({ keywords: z.string(), label: z.string().optional() }),
  }),
]);

export type GraphicSpec = z.infer<typeof GraphicSpecSchema>;

export type CarouselContent = {
  hooks: Hook[];
  slides: CarouselContentSlide[];
  cta: { headline: string; followLine: string };
  caption: string; // IG caption including hashtags
  imagePrompt?: string; // Claude-written Recraft V3 prompt for the hook slide background
};

export type GraphicStyle =
  | "wave"
  | "dotchain"
  | "bars"
  | "steps"
  | "stat"
  | "iconGrid"
  | "textOnly";

export type BrandStyle = {
  background: string;      // content + CTA slide background
  hookBackground: string;  // hook slide background (usually dark)
  headline: string;        // headline text on content/CTA slides
  hookHeadline: string;    // headline text on hook slide (usually light)
  body: string;            // body paragraph text
  accent: string;          // accent / highlight color
  secondary: string;       // muted / citation text
};

export type CarouselConfig = {
  topic: string;
  content: CarouselContent;
  selectedHook: number;
  brandStyle?: BrandStyle;
  hookImageUrl?: string; // template image used as hook slide background overlay
  slideImages?: (string | null)[]; // fal.ai generated images: index 0=hook, 1-3=content, 4=CTA
};

export type SavedCarousel = {
  id: string;
  topic: string;
  hookTone: HookTone;
  content: CarouselContent;
  selectedHook: number;
  graphicStyles?: [GraphicStyle, GraphicStyle, GraphicStyle]; // legacy
  brandStyle?: BrandStyle;
  hookImageUrl?: string;
  slideImages?: (string | null)[];
  showDecoration?: boolean;
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;
  savedAt: string;
};

export type CarouselTemplateImage = {
  id: string;
  url: string;
  slideName: string;
};

export type CarouselTemplate = {
  id: string;
  name: string;
  description?: string;
  contentDensity: "minimal" | "medium" | "dense";
  styleNotes?: string;
  images: CarouselTemplateImage[];
  brandStyle?: BrandStyle;
  uploadedAt: string;
};

export type Subject = {
  id: string;
  text: string;
  category: string;
  usedAt?: string; // ISO date when last used for a carousel
};

export type AssetType = "logo" | "carousel-style" | "product-image" | "other";

export type AssetMetadata = {
  id: string;
  url: string;
  name: string;
  type: string;        // MIME type
  assetType: AssetType; // usage classification
  uploadedAt: string;
};

export type MultiVariantResponse = {
  variants: CarouselContent[];
  warning?: string; // e.g. "2 of 5 variants failed — showing 3"
};

// ─── Ads types ────────────────────────────────────────────────────────────────
export type AdCTA = "Shop Now" | "Learn More" | "Get Offer";

export type SavedAd = {
  id: string;
  savedAt: string;                 // ISO string
  competitorCopy: string;          // original pasted input
  angle?: string;
  emotion?: string;
  headline: string;                // ≤27 chars (Meta hard limit)
  primaryText: string;             // ≤125 chars (Meta hard limit)
  cta: AdCTA;
  imageUrl: string;                // fal.ai hosted URL
  complianceNote?: string;         // empty = clean, non-empty = review flag
};
