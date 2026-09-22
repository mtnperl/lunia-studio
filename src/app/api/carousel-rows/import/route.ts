import { randomUUID } from "crypto";
import { parseXLSX } from "@/lib/xlsx";
import { checkRateLimit, getCarouselRows, saveCarouselRows } from "@/lib/kv";
import { mergeRows, missingColumns, parseRows, REQUIRED_COLUMNS } from "@/lib/carousel-rows";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 2000;

/**
 * Import the carousel review sheet. Send the file as the raw request body
 * (CSV or XLSX); `?dryRun=true` reports what would happen and writes nothing.
 *
 * The file is rejected whole when a column is missing. A half-imported sheet
 * is the worst outcome available: the library looks populated, and the rows
 * that silently failed are the ones nobody goes looking for.
 *
 * Re-import is a merge, matched on the subject line, so a sheet edit lands on
 * the existing row and keeps its id, chosen hook and production status. Rows
 * the new file does not mention are left alone rather than deleted, because a
 * partial export must never look like a deletion.
 */
export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  if (!(await checkRateLimit(ip, "carousel-rows-import"))) {
    return Response.json({ error: "Too many imports. Try again in an hour." }, { status: 429 });
  }
  try {
    const dryRun = new URL(req.url).searchParams.get("dryRun") === "true";

    const buf = await req.arrayBuffer();
    if (buf.byteLength === 0) return Response.json({ error: "Empty file" }, { status: 400 });
    if (buf.byteLength > MAX_BYTES) {
      return Response.json({ error: `File too large (max ${MAX_BYTES} bytes)` }, { status: 413 });
    }

    let table: { headers: string[]; rows: Record<string, string>[] };
    try {
      table = parseXLSX(buf);
    } catch (err) {
      console.error("[api/carousel-rows/import] parse", err);
      return Response.json({ error: "Could not read the file as a CSV or spreadsheet." }, { status: 400 });
    }

    const missing = missingColumns(table.headers);
    if (missing.length > 0) {
      return Response.json(
        {
          error: `The file is missing ${missing.length} required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Nothing was imported.`,
          missing,
          expected: REQUIRED_COLUMNS,
        },
        { status: 400 },
      );
    }
    if (table.rows.length === 0) return Response.json({ error: "No rows in the file" }, { status: 400 });
    if (table.rows.length > MAX_ROWS) {
      return Response.json({ error: `Too many rows (${table.rows.length}); max ${MAX_ROWS}` }, { status: 400 });
    }

    const { rows, errors } = parseRows(table, () => randomUUID());
    const existing = await getCarouselRows().catch(() => []);
    const { merged, added, updated } = mergeRows(existing, rows);

    if (!dryRun) await saveCarouselRows(merged);

    const buildable = rows.filter((r) => r.build === "YES").length;
    console.log(
      `[carousel-rows] ${dryRun ? "dry run: would import" : "imported"} ${rows.length} rows ` +
        `(${added} new, ${updated} updated, ${buildable} buildable, ${errors.length} skipped)`,
    );

    return Response.json({
      dryRun,
      read: table.rows.length,
      imported: rows.length,
      added,
      updated,
      buildable,
      rejected: rows.length - buildable,
      skipped: errors.length,
      errors,
      total: merged.length,
    });
  } catch (err) {
    console.error("[api/carousel-rows/import]", err);
    return Response.json({ error: "Import failed" }, { status: 500 });
  }
}
