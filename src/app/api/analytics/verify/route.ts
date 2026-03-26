export async function POST(req: Request) {
  if (!process.env.ANALYTICS_PASSWORD) {
    return Response.json({ error: 'ANALYTICS_PASSWORD not configured' }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.password) {
    return Response.json({ error: 'password is required' }, { status: 400 });
  }

  const ok = body.password === process.env.ANALYTICS_PASSWORD;
  console.log('[api/analytics/verify] attempt', { ok });

  if (ok) {
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'Incorrect password' }, { status: 401 });
}
