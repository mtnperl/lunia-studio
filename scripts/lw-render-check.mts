// Renders every Le week-end template through the headless render route and
// writes full-size PNGs plus phone-width (390px) copies, which is how the
// page is actually read on Instagram.
// Usage: npx tsx scripts/lw-render-check.mts <origin> <outDir> [photo.jpg | /public-path.jpg]
// A large photo inlined as a data URL can time out the render; serve it from public/ instead.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { LW_DEMO_POSTS, type LwPost } from "../src/lib/le-weekend";

const [origin = "http://localhost:3031", out = "/tmp/lw-check", photo] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const base = { ...LW_DEMO_POSTS[0], caption: "", claimsToVerify: [] } as LwPost;
// A file on disk is inlined; anything else (a "/public" path or a URL) is passed through.
const imageUrl = !photo ? undefined : existsSync(photo) ? `data:image/jpeg;base64,${readFileSync(photo).toString("base64")}` : photo;

const posts: Record<string, LwPost> = {
  chronique: {
    ...base, column: "chronique", cover: "photo", folio: 1, imageUrl, photoTone: "ivory",
    slides: [
      { template: "photo", fields: { headline: "23h10.", subline: "The duvet, pushed off one side." } },
      { template: "chronique", fields: {
        headline: "The warm half of the month",
        column1: "After ovulation, progesterone rises. Among other things it nudges the body's thermostat upward, and core temperature sits roughly 0.3 to 0.5°C higher for the second half of the cycle, night included.",
        column2: "Sleep begins with a fall in core temperature. From a warmer starting point that fall is harder to reach, which is one reason the luteal phase is associated with lighter, more broken nights.",
        figure: { curve: [0.7, 0.66, 0.6, 0.5, 0.4, 0.32, 0.28, 0.3, 0.4], marks: [{ at: 2, label: "evening fall" }, { at: 6, label: "trough" }], axis: ["18h", "22h", "2h", "6h"] },
      } },
    ],
  },
  number: { ...base, column: "chronique", cover: "ivory", slides: [{ template: "chronique-number", fields: { figure: "18°", sideNote: "The bedroom\nmost studies\nland on", headline: "Cool rooms, deeper nights", body: "A room between 16 and 19°C helps the body shed heat at lights out, and that drop in core temperature is part of how deep sleep begins." } }] },
  lexique: LW_DEMO_POSTS[0],
  courrier: LW_DEMO_POSTS[1],
  regles: { ...base, column: "regles", cover: "ivory", slides: [{ template: "regles", fields: { title: "Au lit.", dos: ["Dim the lamps after nine", "Keep the room cool", "Same wake time, weekends too", "Read paper, not glass"], donts: ["Coffee after two", "The phone on the pillow", "A late heavy dinner", "Lie awake for an hour"] } }] },
};

for (const [name, post] of Object.entries(posts)) {
  for (let i = 0; i < post.slides.length; i++) {
    const res = await fetch(`${origin}/api/carousel-v2/render-slide`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "le_week_end", leWeekend: post, lwIndex: i }),
    });
    if (!res.ok) { console.log(name, i, res.status, (await res.text()).slice(0, 200)); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const file = `${out}/${name}_${i + 1}`;
    writeFileSync(`${file}.png`, buf);
    await sharp(buf).resize(390).png().toFile(`${file}_phone.png`);
    console.log(file, res.headers.get("x-slide-fit"));
  }
}
