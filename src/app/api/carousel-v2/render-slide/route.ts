// Render a single carousel content slide to a PNG via Remotion `renderStill`,
// reusing the REAL <ContentSlide> component (composition id "CarouselSlide").
// Mirrors api/video/render's bundle-serving approach. Returns the PNG bytes.
import { readFile, unlink, stat } from "fs/promises";
import { createReadStream } from "fs";
import { createServer } from "http";
import type { AddressInfo } from "net";
import os from "os";
import path from "path";

export const maxDuration = 120;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".wasm": "application/wasm",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

/** Serve the pre-built Remotion bundle (public/remotion) over a local port. */
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
        res.setHeader("Access-Control-Allow-Origin", "*");
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}/`, close: () => server.close() });
    });
    server.on("error", reject);
  });
}

export async function POST(req: Request): Promise<Response> {
  let bundleServer: { url: string; close: () => void } | null = null;
  try {
    // Body is the slide's props: { headline, body, citation, graphic, brandStyle, … }.
    // Empty body → the composition defaultProps (the seeded real slide).
    const inputProps = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    bundleServer = await startBundleServer();
    const serveUrl = bundleServer.url;

    const { renderStill, selectComposition, ensureBrowser } = await import("@remotion/renderer");

    // @sparticuz/chromium on Vercel (Linux); Remotion's own Chromium locally.
    let browserExecutable: string | undefined;
    if (process.env.VERCEL) {
      const chromium = (await import("@sparticuz/chromium")).default;
      browserExecutable = await chromium.executablePath();
    } else {
      await ensureBrowser();
    }
    const browserOpt = browserExecutable ? { browserExecutable } : {};

    const composition = await selectComposition({
      serveUrl,
      id: "CarouselSlide",
      inputProps,
      ...browserOpt,
    });

    const outputPath = path.join(os.tmpdir(), `carousel-slide-${Date.now()}.png`);
    await renderStill({
      composition,
      serveUrl,
      output: outputPath,
      inputProps,
      frame: 0,
      imageFormat: "png",
      ...browserOpt,
    });

    const buffer = await readFile(outputPath);
    await unlink(outputPath).catch(() => {});

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/carousel-v2/render-slide]", err);
    const message = err instanceof Error ? err.message : "Render failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    bundleServer?.close();
  }
}
