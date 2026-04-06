import { put } from "@vercel/blob";
import { readFile, unlink, stat } from "fs/promises";
import { createReadStream } from "fs";
import { createServer } from "http";
import type { AddressInfo } from "net";
import os from "os";
import path from "path";

export const maxDuration = 300;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".wasm": "application/wasm",
  ".ico":  "image/x-icon",
  ".map":  "application/json",
};

/**
 * Spin up a local HTTP server to serve the Remotion bundle from the filesystem.
 * This bypasses all Vercel network/auth/CSP issues that prevent external URLs
 * from working reliably inside a serverless function.
 */
async function startBundleServer(): Promise<{ url: string; close: () => void }> {
  const bundleDir = path.join(process.cwd(), "public", "remotion");

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const reqPath = (req.url ?? "/").split("?")[0];
      const filePath = path.join(bundleDir, reqPath === "/" ? "index.html" : reqPath);

      try {
        await stat(filePath);
        const ext = path.extname(filePath);
        res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
        // Allow the Remotion bundle to load sub-resources from itself
        res.setHeader("Access-Control-Allow-Origin", "*");
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      console.log(`[render] Bundle server started on http://127.0.0.1:${port}/`);
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => server.close(),
      });
    });

    server.on("error", reject);
  });
}

export async function POST(req: Request) {
  let bundleServer: { url: string; close: () => void } | null = null;

  try {
    const body = await req.json();
    const data = body.data;
    const outputFormat: "mp4" | "gif" = body.format === "gif" ? "gif" : "mp4";
    const compositionId: string =
      body.compositionId ?? (data?.videoFormat === "captions" ? "VideoAdCaptions" : "VideoAd");

    // Serve the bundle locally — avoids ALL external URL issues (auth, CSP, networking)
    bundleServer = await startBundleServer();
    const serveUrl = bundleServer.url;

    const chromiumModule = await import("@sparticuz/chromium");
    const chromium = chromiumModule.default;
    const { renderMedia, selectComposition, openBrowser } = await import("@remotion/renderer");

    const browserExecutable = await chromium.executablePath();

    const browser = await openBrowser("chrome", {
      browserExecutable,
      chromiumOptions: { headless: true },
      shouldDumpIo: false,
    });

    try {
      // For GIF: cap to 5 seconds (150 frames) so the Remotion composition, selectComposition,
      // and renderMedia all see internally-consistent data. We build a trimmed inputProps where
      // scenes sum to ≤ GIF_FRAME_CAP — this prevents Remotion's Series from validating
      // sequence totals against a mismatched composition durationInFrames.
      const GIF_FRAME_CAP = 150;

      const totalFrames: number =
        data?.durationFrames ??
        (data?.scenes ?? []).reduce(
          (acc: number, s: { durationFrames: number }) => acc + (s.durationFrames ?? 0),
          0
        );

      let renderData = data;
      if (outputFormat === "gif" && totalFrames > GIF_FRAME_CAP) {
        let remaining = GIF_FRAME_CAP;
        const gifScenes: Array<{ durationFrames: number; [key: string]: unknown }> = [];
        for (const scene of (data.scenes ?? []) as Array<{ durationFrames: number; [key: string]: unknown }>) {
          if (remaining <= 0) break;
          gifScenes.push({ ...scene, durationFrames: Math.min(scene.durationFrames, remaining) });
          remaining -= scene.durationFrames;
        }
        renderData = { ...data, durationFrames: GIF_FRAME_CAP, scenes: gifScenes };
      }

      // selectComposition uses trimmed renderData so it sees the same scene totals
      const composition = await selectComposition({
        serveUrl,
        id: compositionId,
        inputProps: renderData,
        puppeteerInstance: browser,
      });

      // Override composition duration to match our trimmed frame count
      const renderFrames = outputFormat === "gif"
        ? Math.min(totalFrames, GIF_FRAME_CAP)
        : totalFrames;

      if (renderFrames > 0) {
        (composition as { durationInFrames: number }).durationInFrames = renderFrames;
      }

      const ext = outputFormat === "gif" ? "gif" : "mp4";
      const outputPath = path.join(os.tmpdir(), `lunia-${Date.now()}.${ext}`);

      await renderMedia({
        composition,
        serveUrl,
        codec: outputFormat === "gif" ? "gif" : "h264",
        outputLocation: outputPath,
        inputProps: renderData,
        puppeteerInstance: browser,
        imageFormat: "jpeg",
        jpegQuality: outputFormat === "gif" ? 65 : 85,
        ...(outputFormat === "gif"
          ? { everyNthFrame: 5, scale: 0.5 }   // 150→30 rendered frames at 540×960
          : { concurrency: 2 }),
      });

      const buffer = await readFile(outputPath);
      const blobName = `videos/lunia-${Date.now()}.${ext}`;
      const contentType = outputFormat === "gif" ? "image/gif" : "video/mp4";

      const blob = await put(blobName, buffer, {
        access: "public",
        contentType,
      });

      await unlink(outputPath).catch(() => {});

      return Response.json({ url: blob.url, format: outputFormat });
    } finally {
      await browser.close({ silent: true });
    }
  } catch (err) {
    console.error("[api/video/render]", err);
    const message = err instanceof Error ? err.message : "Render failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    bundleServer?.close();
  }
}
