import { put } from "@vercel/blob";
import { saveAssets } from "@/lib/kv";
import { AssetMetadata, AssetType } from "@/lib/types";
import { describeAsset } from "@/lib/asset-caption";
import { randomUUID } from "crypto";

// The caption call adds a few seconds to what used to be a single blob write,
// and a batch runs several of those at once, so this needs room past the
// default function ceiling.
export const maxDuration = 60;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const VALID_ASSET_TYPES: AssetType[] = ["logo", "carousel-style", "product-image", "lifestyle", "gen-z", "other"];

/** Per REQUEST, not per upload. The client sends a big drop as several
 *  requests because Vercel caps a request body at 4.5 MB long before this
 *  number bites; it exists so a malformed caller cannot ask one function
 *  invocation to caption five hundred images. */
const MAX_FILES_PER_REQUEST = 20;

/** How many files within one request are put and captioned at once. The work
 *  is almost entirely waiting on two APIs, so some concurrency is free speed;
 *  the cap keeps a batch from opening twenty sockets and tripping a rate
 *  limit on either side. */
const CONCURRENCY = 4;

type Rejected = { name: string; error: string };

/** Reject anything the blob store or the caption step would choke on, and say
 *  which file it was — in a batch, "Unsupported file type" without a name is
 *  useless. */
function validate(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Unsupported file type. Upload JPEG, PNG, GIF, WebP, or SVG.";
  if (file.size > MAX_SIZE_BYTES) return "File too large. Maximum size is 5 MB.";
  return null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN to your environment variables." },
      { status: 503 }
    );
  }
  try {
    const formData = await req.formData();
    // getAll, so one request can carry a batch. A single-file caller lands
    // here unchanged — it is just a batch of one.
    const files = formData.getAll("file").filter((f): f is File => f instanceof File);
    const assetTypeRaw = formData.get("assetType") as string | null;
    const assetType: AssetType = VALID_ASSET_TYPES.includes(assetTypeRaw as AssetType)
      ? (assetTypeRaw as AssetType)
      : "other";

    if (files.length === 0) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return Response.json(
        { error: `Too many files in one request (${files.length}). Send at most ${MAX_FILES_PER_REQUEST}.` },
        { status: 400 }
      );
    }

    const failed: Rejected[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      const problem = validate(file);
      if (problem) failed.push({ name: file.name, error: problem });
      else accepted.push(file);
    }

    // A batch where every file is invalid is a failed request, not a
    // successful upload of nothing.
    if (accepted.length === 0) {
      return Response.json({ error: failed[0]!.error, uploaded: [], failed }, { status: 400 });
    }

    const results = await mapWithConcurrency(accepted, CONCURRENCY, async (file): Promise<AssetMetadata | Rejected> => {
      try {
        const ext = file.name.split(".").pop() ?? "bin";
        const blob = await put(`assets/${randomUUID()}.${ext}`, file, { access: "public" });

        // Caption while we are already paying for the round trip, so the
        // library is searchable by the model from the moment it lands.
        // Awaited rather than fired-and-forgotten: this runs in a serverless
        // function, which stops executing once the response is returned, so a
        // floating promise here would be killed whenever it felt like it. The
        // helper swallows its own failures, so this cannot fail the upload.
        const description = await describeAsset({ url: blob.url, type: file.type, name: file.name });

        return {
          id: randomUUID(),
          url: blob.url,
          name: file.name,
          type: file.type,
          assetType,
          uploadedAt: new Date().toISOString(),
          ...(description ? { description } : {}),
        };
      } catch (err) {
        // One bad file must not cost the other nineteen their upload.
        return { name: file.name, error: err instanceof Error ? err.message : String(err) };
      }
    });

    const uploaded = results.filter((r): r is AssetMetadata => "id" in r);
    failed.push(...results.filter((r): r is Rejected => !("id" in r)));

    // ONE write for the whole batch. Calling saveAsset per file would have
    // each one re-read and rewrite the single key holding the entire library,
    // and two overlapping writes silently lose the earlier one's entry.
    await saveAssets(uploaded);

    // A single-file caller gets the shape it has always had, alongside the
    // batch fields — ImagePromptCard reads data.url directly.
    const single = files.length === 1 && uploaded.length === 1 ? uploaded[0]! : null;
    return Response.json({
      ...(single ? { id: single.id, url: single.url, assetType: single.assetType, description: single.description } : {}),
      uploaded,
      failed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/assets/upload]", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
