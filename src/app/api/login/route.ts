import { z } from "zod";
import { checkRateLimit } from "@/lib/kv";
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, authIsConfigured, signCookie } from "@/lib/auth";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const bodySchema = z.object({
  password: z.string().min(1).max(200),
});

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/login", "auth");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "login");
  if (!allowed) {
    logExit("/api/login", "auth", start, 429);
    return Response.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }
  try {
    const cfg = authIsConfigured();
    if (!cfg.ok) {
      logExit("/api/login", "auth", start, 503);
      return Response.json({ error: `Server misconfigured: ${cfg.reason}` }, { status: 503 });
    }
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/login", "auth", start, 400);
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    if (parsed.data.password !== process.env.APP_PASSWORD) {
      logExit("/api/login", "auth", start, 401);
      return Response.json({ error: "Wrong password" }, { status: 401 });
    }
    const expiresAt = Date.now() + AUTH_COOKIE_MAX_AGE * 1000;
    const value = await signCookie(process.env.AUTH_SECRET!, expiresAt);

    const secure = process.env.NODE_ENV === "production";
    const cookie = [
      `${AUTH_COOKIE_NAME}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${AUTH_COOKIE_MAX_AGE}`,
      secure ? "Secure" : "",
    ].filter(Boolean).join("; ");

    logExit("/api/login", "auth", start, 200);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
    });
  } catch (err) {
    console.error("[api/login] POST", err);
    logExit("/api/login", "auth", start, 500);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
