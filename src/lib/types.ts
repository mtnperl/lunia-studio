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
  graphic?: string; // SVG infographic string from Claude
};

export type CarouselContent = {
  hooks: Hook[];
  slides: CarouselContentSlide[];
  cta: { headline: string; followLine: string };
  caption: string; // IG caption including hashtags
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
  hookImageUrl?: string;
  slideImages?: (string | null)[];
};

export type SavedCarousel = {
  id: string;
  topic: string;
  hookTone: HookTone;
  content: CarouselContent;
  selectedHook: number;
  graphicStyles?: [GraphicStyle, GraphicStyle, GraphicStyle]; // legacy
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
