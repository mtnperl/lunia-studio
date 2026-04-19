export async function verifyEnvPassword(req: Request, envVar: string): Promise<Response> {
  const secret = process.env[envVar];
  if (!secret) {
    return Response.json({ error: `${envVar} not configured` }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.password) {
    return Response.json({ error: "password is required" }, { status: 400 });
  }

  const ok = body.password === secret;
  console.log(`[password-gate] ${envVar} attempt`, { ok });

  if (ok) return Response.json({ ok: true });
  return Response.json({ error: "Incorrect password" }, { status: 401 });
}
