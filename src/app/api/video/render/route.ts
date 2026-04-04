import { put } from "@vercel/blob";
import { readFile, unlink } from "fs/promises";
import os from "os";
import path from "path";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.data;
    const outputFormat: "mp4" | "gif" = body.format === "gif" ? "gif" : "mp4";
    const compositionId: string =
      body.compositionId ?? (data?.videoFormat === "captions" ? "VideoAdCaptions" : "VideoAd");

    const appUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const serveUrl = `${appUrl}/remotion/`;

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
      const composition = await selectComposition({
        serveUrl,
        id: compositionId,
        inputProps: data,
        puppeteerInstance: browser,
      });

      // Honor the actual data duration
      const totalFrames: number =
        data?.durationFrames ??
        (data?.scenes ?? []).reduce(
          (acc: number, s: { durationFrames: number }) => acc + (s.durationFrames ?? 0),
          0
        );
      if (totalFrames > 0) {
        (composition as { durationInFrames: number }).durationInFrames = totalFrames;
      }

      const ext = outputFormat === "gif" ? "gif" : "mp4";
      const outputPath = path.join(os.tmpdir(), `lunia-${Date.now()}.${ext}`);

      await renderMedia({
        composition,
        serveUrl,
        codec: outputFormat === "gif" ? "gif" : "h264",
        outputLocation: outputPath,
        inputProps: data,
        puppeteerInstance: browser,
        imageFormat: "jpeg",
        jpegQuality: outputFormat === "gif" ? 70 : 85,
        // For GIF, limit FPS and use fewer frames to keep file size manageable
        ...(outputFormat === "gif" ? { everyNthFrame: 3 } : { concurrency: 2 }),
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
  }
}
