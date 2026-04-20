import { getSubjects, saveSubjects } from "@/lib/kv";
import type { Subject } from "@/lib/types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const subjects = await getSubjects();
  return Response.json(subjects, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    if (text.length < 4 || text.length > 200) {
      return Response.json({ error: "Topic must be 4-200 characters" }, { status: 400 });
    }
    if (!category) {
      return Response.json({ error: "Category required" }, { status: 400 });
    }
    const all = await getSubjects();
    const dupe = all.find((s) => s.text.trim().toLowerCase() === text.toLowerCase());
    if (dupe) {
      return Response.json({ error: "Topic already exists" }, { status: 409 });
    }
    const created: Subject = { id: randomUUID(), text, category };
    await saveSubjects([created, ...all]);
    return Response.json(created, { status: 201 });
  } catch (err) {
    console.error("[api/subjects POST]", err);
    return Response.json({ error: "Failed to add topic" }, { status: 500 });
  }
}
