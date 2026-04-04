import { put } from "@vercel/blob";
import { readFile, unlink } from "fs/promises";
import os from "os";
import path from "path";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.data;
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

      const outputPath = path.join(os.tmpdir(), `lunia-${Date.now()}.mp4`);

      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation: outputPath,
        inputProps: data,
        puppeteerInstance: browser,
        imageFormat: "jpeg",
        jpegQuality: 85,
        concurrency: 2,
      });

      const buffer = await readFile(outputPath);
      const blob = await put(`videos/lunia-${Date.now()}.mp4`, buffer, {
        access: "public",
        contentType: "video/mp4",
      });

      await unlink(outputPath).catch(() => {});

      return Response.json({ url: blob.url });
    } finally {
      await browser.close({ silent: true });
    }
  } catch (err) {
    console.error("[api/video/render]", err);
    const message = err instanceof Error ? err.message : "Render failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
