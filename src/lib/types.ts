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
  | "personal-story"
  | "did-you-know"
  | "smart-tip";
export type CarouselFormat = "standard" | "engagement" | "did_you_know";
export type EngagementSubType = "reveal" | "diagnostic";

// ─── Did You Know format ─────────────────────────────────────────────────────
import { z as zDyk } from 'zod';

export const DidYouKnowTokenSchema = zDyk.object({
  text: zDyk.string(),
  highlight: zDyk.boolean(),
});

export const DidYouKnowSlideContentSchema = zDyk.object({
  header: zDyk.string().min(1),
  body1: zDyk.array(DidYouKnowTokenSchema).min(1),
  body2: zDyk.array(DidYouKnowTokenSchema).min(1),
});

export const DidYouKnowContentSchema = zDyk.object({
  topic: zDyk.string().min(1),
  slide1: DidYouKnowSlideContentSchema,
  slide2: DidYouKnowSlideContentSchema,
  caption: zDyk.string().min(1),
  violations: zDyk.array(zDyk.string()).optional(),
});

export const DidYouKnowVariantsResponseSchema = zDyk.object({
  variants: zDyk.array(DidYouKnowContentSchema).min(1),
  warning: zDyk.string().optional(),
});

export type DidYouKnowToken = zDyk.infer<typeof DidYouKnowTokenSchema>;
export type DidYouKnowSlideContent = zDyk.infer<typeof DidYouKnowSlideContentSchema>;
export type DidYouKnowContent = zDyk.infer<typeof DidYouKnowContentSchema>;
export type DidYouKnowVariantsResponse = zDyk.infer<typeof DidYouKnowVariantsResponseSchema>;

export type Topic = {
  title: string;
  description: string;
  pillar: string;
};

export type Hook = {
  headline: string;
  subline: string;
  sourceNote?: string;
};

export type CarouselContentSlide = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string; // GraphicSpec JSON string (new) or raw SVG string (legacy)
  graphicImagePrompt?: string; // fal.ai prompt for TIER B/C slides (AI-generated visual)
  graphicImageUrl?: string;    // fal.ai hosted URL once generated
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
  z.object({
    component: z.literal('icon'),
    data: z.object({ id: z.string(), label: z.string().optional() }),
  }),
  z.object({
    component: z.literal('iconLayout'),
    data: z.object({
      icons: z.array(z.object({ id: z.string() })).min(1).max(4),
      layout: z.enum(['row', 'column', 'grid', 'scattered']),
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
  commentKeyword?: string; // engagement format: auto-generated keyword for comment CTA
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
  showLuniaLifeWatermark?: boolean;
  imageStyle?: string;     // "realistic" | "cartoon" | "anime" | "vector"
  format?: CarouselFormat; // "standard" (default) | "engagement" | "did_you_know"
  engagementSubType?: EngagementSubType; // "reveal" | "diagnostic" — only when format is "engagement"
  didYouKnowContent?: DidYouKnowContent; // present iff format === "did_you_know"
  reelsMode?: boolean;     // true = 9:16 Reels format
  citationFontSize?: number;
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
  linkClicks: number;      // inline_link_clicks
  cpm: number;             // spend / impressions * 1000
  purchases: number;       // count from actions[offsite_conversion.fb_pixel_purchase]
};

export type MetaAd = {
  adId: string;
  adName: string;
  adsetName?: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  linkClicks: number;    // inline_link_clicks
  ctr: number;           // linkClicks / impressions * 100
  cpm: number;           // spend / impressions * 1000
  purchases: number;     // count from actions[offsite_conversion.fb_pixel_purchase]
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
  ads: MetaAd[];
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
  orders: number;              // paid orders since 1st of month (excl. $0)
  revenue: number;             // gross revenue from paid orders
  sessions: number;            // website sessions (0 if unavailable)
  cvr: number;                 // orders / sessions, 0 if sessions === 0
  sessionsAvailable: boolean;  // false if ShopifyQL not available on plan
  sessionsError?: string;      // human-readable reason if sessions unavailable
  // Checkout funnel (from read_checkouts — available on all plans)
  abandonedCheckouts: number;  // open/incomplete checkouts this month
  abandonedRevenue: number;    // value in abandoned checkouts
  checkoutCvr: number;         // orders / (orders + abandoned) * 100
  // Returning customers (from read_all_orders)
  returningOrders: number;     // orders from repeat customers
  returningRate: number;       // returningOrders / orders * 100
  // Refunds (from read_all_orders)
  refundedRevenue: number;     // total value of refunded orders this month
  netRevenue: number;          // revenue - refundedRevenue
  refundRate: number;          // refundedOrders / orders * 100
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
export type VideoImageStyle = "realistic" | "cartoon" | "anime" | "vector";

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

export type VideoTextStyle = {
  textBackdrop?: boolean;     // semi-transparent dark box behind text blocks
  textStroke?: boolean;       // dark outline around text for legibility
  fontWeight?: 700 | 900;     // 700 = bold, 900 = black/heavy
  allCaps?: boolean;          // UPPERCASE all headlines
  overlayOpacity?: number;    // 0–1; overrides the style-default image overlay
  lineBreakChars?: number;    // 0 = off; break headline at word boundary when line > N chars
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
  textStyle?: VideoTextStyle;
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

// ─── Email Intelligence types ─────────────────────────────────────────────────

export type StylePreset = 'minimal-modern' | 'story-driven' | 'bold-product-first';

export type EmailSection = {
  id: string;
  heading?: string;
  body: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageStyle?: "realistic" | "illustration" | "anime" | "vector";
};

export type EmailAnatomy = {
  subjectFormula: string;
  preheaderStrategy: string;
  visualStructure: string;
  inferredImageRatio: string; // heuristic: "heavy image", "text-first", "balanced"
  copyFramework: string;
  ctaType: string;
  hasPsLine: boolean;
};

export type SavedEmail = {
  id: string;
  competitorText: string;       // original pasted text (≤8000 chars, kept for side-by-side view)
  stylePreset: StylePreset;
  anatomy: EmailAnatomy;
  score: number;                // 1-10
  scoreDiagnosis: string;       // e.g. "Strong hook, weak CTA, no visual hierarchy"
  frameworkLabel: string;       // e.g. "Pattern Interrupt + PAS + Single CTA"
  sendTimingChip: string;       // e.g. "Educational → Tue/Wed 9am"
  generated: {
    subjectLines: string[];     // 3 variants in Lunia voice
    preheader: string;
    sections: EmailSection[];
    cta: string;
    ps: string;                 // always generated, non-optional
  };
  imageUrl?: string;
  imagePrompt?: string;         // shown in Image Zone, editable before generating
  savedAt: string;
};

// ─── UGC Tracker ──────────────────────────────────────────────────────────────

export type UGCPipelineStage =
  | "invited"
  | "approved"
  | "delivered"
  | "edited-and-ready"
  | "posted"
  | "cancelled";

export const UGC_PIPELINE_STAGES: UGCPipelineStage[] = [
  "invited",
  "approved",
  "delivered",
  "edited-and-ready",
  "posted",
  "cancelled",
];

export const UGC_STAGE_LABELS: Record<UGCPipelineStage, string> = {
  invited: "Invited",
  approved: "Approved",
  delivered: "Delivered",
  "edited-and-ready": "Edited & ready",
  posted: "Posted",
  cancelled: "Cancelled",
};

export type UGCSourcingPlatform = "BACKSTAGE" | "upwork" | "other";

export type BriefStatus = "draft" | "approved" | "archived";

export interface BriefScript {
  videoHook: string;       // on-camera hook, first 1-2 seconds
  textHook: string;        // text overlay / caption hook
  narrative: string;       // main script body (multi-line)
  cta: string;             // closing line / call-to-action
}

export interface UGCBriefDoc {
  aboutBrand: string;          // Who Lunia Life is and why it matters
  whoWereLookingFor: string;   // Target creator profile
  theConcept: string;          // The content angle / concept
  theSetup: string;            // How the video should be structured
  whereToFilm: string;         // Location / environment guidance
  deliverables: string;        // What the creator must deliver
}

export interface BriefComplianceFlag {
  severity: "amber" | "red";
  rule: string;
  match: string;
}

export interface UGCBrief {
  id: string;
  publicBriefId: string;            // nanoid; used in public share URL
  angle: string;                    // AngleLibrary key (e.g. "perimenopause")
  conceptId: string | null;         // AngleConcept.id if generated from library; null if custom
  conceptLabel: string;             // display label (usually the concept's label)
  title: string;                    // brief title (angle + concept by default)
  doc: UGCBriefDoc | null;          // structured brief document sections (null on old briefs)
  script: BriefScript;
  caption: string;                  // social-media caption tied to this script (not the creator)
  complianceFlags: BriefComplianceFlag[];
  status: BriefStatus;
  creatorName: string | null;       // optional assigned creator
  createdAt: number;
  updatedAt: number;
  sharedAt: number | null;          // when the share link was first copied (controls revoke visibility)
  revokedAt: number | null;         // if set, public share link returns 410
}

export interface UGCCreator {
  id: string;
  name: string;
  angle: string;
  briefId: string | null;
  sourcingPlatform: UGCSourcingPlatform;
  cost: number;                 // USD
  goodsShipped: boolean;
  stage: UGCPipelineStage;
  versionsDelivered: number;
  caption1: string;
  caption2: string;
  notes: string;
  postedUrl: string | null;     // reserved for future perf-loop tie-in
  createdAt: number;
  updatedAt: number;
}

export interface UGCCampaign {
  id: string;                   // "2026-04"
  label: string;                // "April 2026"
  month: number;                // 1-12
  year: number;
  creators: UGCCreator[];
  schemaVersion: 1;
  createdAt: number;
  updatedAt: number;
}
