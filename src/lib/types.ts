export type Comment = {
  author: string;
  text: string;
  time: string;
};

export type FilmingNotes = {
  setting: string;
  wardrobe: string;
  broll: string;
  director: string;
};

export type Script = {
  id: string;
  title: string;
  hook: string;
  lines: string[];
  comments: Record<number, Comment[]>;
  filmingNotes: FilmingNotes;
  creator: string;
  status: "draft" | "review" | "locked";
  persona: string;
  angle: string;
  format: string;
  savedAt: string;
};
