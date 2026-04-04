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
  subjectNotes?: string;   // background info on the subject
  instructions?: string;   // specific creative directives
  reviewEmails?: string[];
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
    data: z.object({
      keywords: z.string(),
      label: z.string().optional(),
      mood: z.enum(['calm', 'energetic', 'scientific', 'playful']).optional(),
    }),
  }),
  // ── Layout Infographics (Tier 3) ──────────────────────────────────────────
  z.object({
    component: z.literal('hubSpoke'),
    data: z.object({
      center: z.string(),
      spokes: z.array(z.object({ label: z.string() })).min(3).max(5),
    }),
  }),
  z.object({
    component: z.literal('iceberg'),
    data: z.object({
      surface: z.array(z.string()).min(1).max(3),
      hidden: z.array(z.string()).min(2).max(4),
      surfaceLabel: z.string().optional(),
      hiddenLabel: z.string().optional(),
    }),
  }),
  z.object({
    component: z.literal('bridge'),
    data: z.object({
      from: z.string(),
      to: z.string(),
      label: z.string().optional(),
    }),
  }),
  z.object({
    component: z.literal('circularCycle'),
    data: z.object({
      steps: z.array(z.object({ label: z.string() })).min(3).max(5),
    }),
  }),
  z.object({
    component: z.literal('bento'),
    data: z.object({
      tiles: z.array(z.object({ icon: z.string(), label: z.string(), body: z.string().optional() })).min(2).max(4),
    }),
  }),
  z.object({
    component: z.literal('conceptFlow'),
    data: z.object({
      nodes: z.array(z.object({ label: z.string(), sublabel: z.string().optional() })).min(3).max(5),
      title: z.string().optional(),
    }),
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

// ─── Analytics / Dashboard ───────────────────────────────────────────────────

export type MetaCampaign = {
  campaignId: string;
  campaignName: string;
  campaignObjective?: string; // e.g. OUTCOME_SALES, OUTCOME_AWARENESS
  spend: number;           // USD
  revenue: number;         // from action_values[offsite_conversion.fb_pixel_purchase]
  roas: number;            // revenue / spend
  impressions: number;
  clicks: number;
  ctr: number;             // clicks / impressions * 100
};

export type MetaAdInsight = {
  date: string;            // YYYY-MM-DD
  spend: number;
  revenue: number;
};

export type MetaData = {
  summary: {
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
  };
  campaigns: MetaCampaign[];
  by_day: MetaAdInsight[];
};

export type ShopifyDayRow = {
  date: string;            // YYYY-MM-DD
  orders: number;
  revenue: number;
};

export type ShopifyProduct = {
  productTitle: string;
  variantTitle?: string;
  orders: number;
  revenue: number;
};

export type ShopifyData = {
  summary: {
    orders: number;
    revenue: number;
    aov: number;                  // 0 if orders === 0 (guard against div/0)
    subscriptionRevenue: number;  // revenue from subscription orders
    onetimeRevenue: number;       // revenue from one-time purchase orders
    subscriptionOrders: number;   // count of subscription orders
    onetimeOrders: number;        // count of one-time purchase orders
  };
  by_day: ShopifyDayRow[];
  products: ShopifyProduct[];  // top products by revenue
};

export type ShopifyLTVData = {
  avgSubscriptionLTV: number;    // mean all-time revenue per subscription customer
  avgOnetimeLTV: number;         // mean all-time revenue per one-time customer
  subscriptionCustomerCount: number;
  onetimeCustomerCount: number;
};

export type ShopifyMtdData = {
  orders: number;    // paid orders so far this calendar month
  sessions: number;  // website sessions so far this calendar month (null if unavailable)
  cvr: number;       // orders / sessions, 0 if sessions === 0
  sessionsAvailable: boolean; // false if Shopify analytics scope is missing
};

export type CombinedDayRow = {
  date: string;            // YYYY-MM-DD; sorts lexicographically
  spend: number;           // Meta spend
  shopifyRevenue: number;  // Shopify paid revenue; 0 if no orders that day
  shopifyOrders: number;
};

export type Insight = {
  title: string;
  body: string;
  type: 'positive' | 'warning' | 'neutral';
};

// ─── Video Ad types ───────────────────────────────────────────────────────────

export type VideoStyle = "cinematic" | "serene" | "bold";

export type VideoAdSceneType = "hook" | "science" | "product" | "proof" | "cta";

export type TextPosition = "top" | "center" | "bottom";

export type VideoAdScene = {
  type: VideoAdSceneType;
  durationFrames: number;   // at 30fps; hook=90, science=150, product=150, proof=150, cta=210
  headline: string;
  subline?: string;
  stat?: string;            // science + proof scenes only
  caption?: string;         // science scene: journal attribution
  textPosition?: TextPosition;
};

// How an image is fitted into the 9:16 frame
export type SceneImageFit = "cover" | "contain";

export type SceneImageConfig = {
  url: string;
  fit: SceneImageFit;
  // objectPosition for "cover" mode, e.g. "50% 30%". Defaults to "50% 50%"
  position?: string;
};

export type VideoAdData = {
  topic: string;
  scenes: VideoAdScene[];   // exactly 5, one per type in order
  // Per-scene image assignment — any scene can have a background image
  sceneImages: Partial<Record<VideoAdSceneType, SceneImageConfig>>;
  fps: 30;
  durationFrames: number;   // sum of scene durationFrames
  logoUrl?: string;         // Lunia Life logo shown in CTA scene
  fontScale?: number;       // multiplier for all font sizes (default 1.0)
  videoStyle?: VideoStyle;
  videoFormat?: VideoFormat;
};

export type SavedVideoAd = {
  id: string;
  topic: string;
  data: VideoAdData;
  renderUrl?: string;       // populated after Lambda render
  savedAt: string;
};

export type VideoAssetType = "product-image-vertical" | "lifestyle-image" | "product-video" | "logo";

export type VideoFormat = "brand-story" | "captions";

// ─── TikTok-style Captions composition ───────────────────────────────────────
export type VideoCaptionsData = {
  topic: string;
  captions: string[];          // 5-7 short sentences, shown word-by-word
  backgroundImageUrl?: string; // optional full-bleed background image
  logoUrl?: string;
  fontScale?: number;
  videoStyle?: VideoStyle;
  fps: 30;
  durationFrames: number;      // captions.length * 75
};

export type VideoAssetMetadata = {
  id: string;
  url: string;
  name: string;
  type: string;             // MIME type
  assetType: VideoAssetType;
  uploadedAt: string;
};
