import type { Metadata } from "next";
import StyleGuideClient from "./StyleGuideClient";

export const metadata: Metadata = { title: "Style guide · Lunia Studio" };

/** Rendered reference for the token layer and the primitives. Behind the
 *  same auth as the rest of the app. */
export default function StyleGuidePage() {
  return <StyleGuideClient />;
}
