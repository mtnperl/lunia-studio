import { NextRequest } from "next/server";
import { kv } from "@/lib/kv";
import { scanCompliance, type ComplianceLevel } from "@/lib/compliance";

export function clientIp(req: Request | NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export function logEntry(route: string, action: string, extra: Record<string, unknown> = {}): number {
  const start = Date.now();
  console.log(JSON.stringify({ route, action, phase: "start", ...extra }));
  return start;
}

export function logExit(
  route: string,
  action: string,
  start: number,
  status: number,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      route,
      action,
      phase: "end",
      status,
      durationMs: Date.now() - start,
      ...extra,
    }),
  );
}

export async function incrComplianceMetric(level: ComplianceLevel): Promise<void> {
  try {
    await kv.incr(`lunia:metrics:caption:${level}`);
  } catch {
    /* best-effort; not load-bearing */
  }
}

export { scanCompliance };
