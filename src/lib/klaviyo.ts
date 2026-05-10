// Klaviyo API client — server-side only.
// NEVER import this file from a 'use client' component.
import "server-only";
import { redis as kv } from "./kv";
import type { EmailFlow, EmailFlowAsset } from "./types";

const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2024-10-15";

// --- Errors -----------------------------------------------------------------

export class KlaviyoAuthError extends Error {
  constructor(message = "Klaviyo API key invalid or missing") {
    super(message);
    this.name = "KlaviyoAuthError";
  }
}
export class KlaviyoRateLimitError extends Error {
  constructor(public retryAfterSec: number) {
    super(`Klaviyo rate limit hit. Retry after ${retryAfterSec}s`);
    this.name = "KlaviyoRateLimitError";
  }
}
export class KlaviyoNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KlaviyoNotFoundError";
  }
}
export class KlaviyoServerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "KlaviyoServerError";
  }
}

// --- Auth + fetch wrapper ---------------------------------------------------

function readKey(): string | null {
  return process.env.KLAVIYO_API_KEY ?? null;
}
// Use the dedicated write key when set; otherwise fall back to KLAVIYO_API_KEY
// so a single full-access Klaviyo key satisfies both read and write paths.
// Set KLAVIYO_API_KEY_WRITE explicitly only when you want to isolate write
// capability behind a separate, scoped key.
function writeKey(): string | null {
  return process.env.KLAVIYO_API_KEY_WRITE ?? process.env.KLAVIYO_API_KEY ?? null;
}

export function hasReadAccess(): boolean { return !!readKey(); }
export function hasWriteAccess(): boolean { return !!writeKey(); }

type FetchOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  useWriteKey?: boolean;
  timeoutMs?: number;
  // Backoff: number of retry attempts on 429 / 5xx
  retries?: number;
};

async function klaviyoFetch<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", body, useWriteKey = false, timeoutMs = 5000, retries = 3 } = opts;
  const key = useWriteKey ? writeKey() : readKey();
  if (!key) throw new KlaviyoAuthError(useWriteKey
    ? "Klaviyo write key not set. Add KLAVIYO_API_KEY (full-access) or KLAVIYO_API_KEY_WRITE."
    : "KLAVIYO_API_KEY not set");

  const url = path.startsWith("http") ? path : `${KLAVIYO_BASE}${path}`;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Klaviyo-API-Key ${key}`,
          "revision": KLAVIYO_REVISION,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(t);

      if (res.status === 401 || res.status === 403) {
        throw new KlaviyoAuthError(`Klaviyo ${res.status}: ${await res.text().catch(() => "")}`);
      }
      if (res.status === 404) {
        throw new KlaviyoNotFoundError(`Klaviyo 404 for ${path}`);
      }
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "5", 10);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, Math.min(retryAfter, 30) * 1000));
          continue;
        }
        throw new KlaviyoRateLimitError(retryAfter);
      }
      if (res.status >= 500) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, Math.min(2 ** attempt, 8) * 1000));
          continue;
        }
        throw new KlaviyoServerError(res.status, await res.text().catch(() => ""));
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new KlaviyoServerError(res.status, text);
      }
      // Some endpoints return 204
      if (res.status === 204) return undefined as T;
      return await res.json() as T;
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      // Re-throw classified errors immediately (auth / not-found / final-attempt rate-limit)
      if (
        err instanceof KlaviyoAuthError ||
        err instanceof KlaviyoNotFoundError ||
        err instanceof KlaviyoRateLimitError ||
        err instanceof KlaviyoServerError
      ) throw err;
      // Network / abort error — retry
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, Math.min(2 ** attempt, 8) * 1000));
        continue;
      }
    }
  }
  throw lastErr ?? new Error("Klaviyo fetch failed after retries");
}

// --- Cache helpers ----------------------------------------------------------

const CACHE_TTL_SECONDS = 60 * 60;        // 60 min soft TTL
const CACHE_HARD_TTL_SECONDS = 60 * 60 * 24; // 24 h hard TTL

async function cachedFetch<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const hit = await kv.get<{ data: T; cachedAt: number }>(cacheKey);
    if (hit && Date.now() - hit.cachedAt < CACHE_TTL_SECONDS * 1000) {
      return hit.data;
    }
  } catch { /* KV miss / unavailable — fetch fresh */ }
  const data = await fetcher();
  try {
    await kv.set(cacheKey, { data, cachedAt: Date.now() }, { ex: CACHE_HARD_TTL_SECONDS });
  } catch { /* best-effort */ }
  return data;
}

// --- Types from Klaviyo (just the shapes we need) ---------------------------

type KFlowsResponse = {
  data: { id: string; attributes: { name: string; status: string; trigger_type: string; created: string } }[];
};
type KFlowResponse = {
  data: { id: string; attributes: { name: string; status: string; trigger_type: string; created: string } };
};
type KFlowActionsResponse = {
  data: {
    id: string;
    attributes: { action_type: string; settings?: { delay?: number }; tracking_options?: unknown };
    relationships?: { "flow-messages"?: { data: { id: string }[] } };
  }[];
};
type KFlowMessageResponse = {
  data: {
    id: string;
    attributes: {
      name: string;
      channel: string;
      content?: { subject?: string; preview_text?: string; from_email?: string; from_label?: string };
      created: string;
    };
    relationships?: { template?: { data?: { id: string } } };
  };
};
type KTemplateResponse = {
  data: {
    id: string;
    attributes: { name: string; html: string; text?: string; editor_type?: string; created: string; updated: string };
  };
};

// --- Public read API --------------------------------------------------------

export type KlaviyoFlowSummary = {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  emailCount: number;
};

export async function listFlows(): Promise<KlaviyoFlowSummary[]> {
  return cachedFetch("klaviyo:flows:list", async () => {
    const out = await klaviyoFetch<KFlowsResponse>("/flows/?fields[flow]=name,status,trigger_type,created");
    const summaries: KlaviyoFlowSummary[] = [];
    for (const f of out.data ?? []) {
      // Fetch action count per flow lazily — for v1 we shortcut to 0 and
      // populate during getFlow detail. Listing 100+ flows × actions blows up
      // the rate limit budget.
      summaries.push({
        id: f.id,
        name: f.attributes.name,
        status: f.attributes.status,
        triggerType: f.attributes.trigger_type,
        emailCount: 0,
      });
    }
    return summaries;
  });
}

// Map Klaviyo trigger type to our EmailFlowType taxonomy. Conservative:
// fall back to "campaign" so the analyze prompt still runs (Section 2 will
// say "single campaign" for unknown shapes).
function mapFlowType(triggerType: string, name: string): EmailFlow["flowType"] {
  const t = (triggerType || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (n.includes("abandon") && (n.includes("checkout") || n.includes("cart"))) return "abandoned_checkout";
  if (n.includes("browse")) return "browse_abandonment";
  if (n.includes("welcome")) return "welcome";
  if (n.includes("post") || n.includes("onboard") || n.includes("post-purchase")) return "post_purchase";
  if (n.includes("replenish") || n.includes("reorder")) return "replenishment";
  if (n.includes("lapsed") || n.includes("winback") || n.includes("reactivate")) return "lapsed";
  if (t.includes("checkout")) return "abandoned_checkout";
  if (t.includes("viewed_product") || t.includes("browse")) return "browse_abandonment";
  if (t.includes("subscribed") || t.includes("welcome")) return "welcome";
  if (t.includes("placed_order")) return "post_purchase";
  return "campaign";
}

export async function getFlow(flowId: string): Promise<EmailFlow> {
  // Read flow + actions
  const flowRes = await klaviyoFetch<KFlowResponse>(`/flows/${flowId}/?fields[flow]=name,status,trigger_type,created`);
  const actionsRes = await klaviyoFetch<KFlowActionsResponse>(`/flows/${flowId}/flow-actions/?include=flow-messages&fields[flow-action]=action_type,settings,tracking_options`);

  const messageIds: { id: string; delaySec: number; position: number }[] = [];
  let cumDelaySec = 0;
  let position = 0;
  for (const action of actionsRes.data ?? []) {
    const t = action.attributes?.action_type ?? "";
    if (t === "TIME_DELAY" || t === "WAIT") {
      cumDelaySec += action.attributes?.settings?.delay ?? 0;
    }
    if (t === "SEND_EMAIL" || t === "EMAIL") {
      const msgIds = action.relationships?.["flow-messages"]?.data?.map(d => d.id) ?? [];
      for (const id of msgIds) {
        position += 1;
        messageIds.push({ id, delaySec: cumDelaySec, position });
      }
    }
  }

  // Hydrate each flow message → EmailFlowAsset
  const emails: EmailFlowAsset[] = [];
  for (const m of messageIds) {
    try {
      const msg = await klaviyoFetch<KFlowMessageResponse>(`/flow-messages/${m.id}/?fields[flow-message]=name,channel,content,created`);
      const attrs = msg.data?.attributes;
      if (!attrs || attrs.channel?.toLowerCase() !== "email") continue;
      const tplId = msg.data?.relationships?.template?.data?.id;
      let html: string | undefined;
      let bodyText: string | undefined;
      if (tplId) {
        try {
          const tpl = await klaviyoFetch<KTemplateResponse>(`/templates/${tplId}/?fields[template]=name,html,text,editor_type`);
          html = tpl.data?.attributes?.html;
          bodyText = tpl.data?.attributes?.text;
        } catch { /* template fetch best-effort */ }
      }
      emails.push({
        id: m.id,
        position: m.position,
        subject: attrs.content?.subject ?? "",
        previewText: attrs.content?.preview_text ?? "",
        senderName: attrs.content?.from_label ?? "",
        senderEmail: attrs.content?.from_email ?? "",
        sendDelayHours: Math.round((m.delaySec ?? 0) / 3600),
        html,
        bodyText,
      });
    } catch { /* skip broken message but keep going */ }
  }

  const flowName = flowRes.data?.attributes?.name ?? "(unnamed flow)";
  const triggerType = flowRes.data?.attributes?.trigger_type ?? "";

  return {
    id: `klaviyo-${flowId}`,
    source: "klaviyo",
    klaviyoFlowId: flowId,
    flowType: mapFlowType(triggerType, flowName),
    flowName,
    trigger: triggerType || "(unknown trigger)",
    emails,
    fetchedAt: new Date().toISOString(),
  };
}

export type KlaviyoCampaignSummary = {
  id: string;
  name: string;
  subject: string;
  sendTime: string;
  status: string;
};

type KCampaignsResponse = {
  data: { id: string; attributes: { name: string; send_time?: string; status: string; send_options?: { use_smart_sending?: boolean } } }[];
};

export async function listCampaigns(limit = 50): Promise<KlaviyoCampaignSummary[]> {
  const out = await klaviyoFetch<KCampaignsResponse>(`/campaigns/?filter=equals(messages.channel,'email')&page[size]=${Math.min(limit, 100)}&sort=-send_time&fields[campaign]=name,send_time,status,send_options`);
  return (out.data ?? []).map(c => ({
    id: c.id,
    name: c.attributes.name,
    subject: c.attributes.name,
    sendTime: c.attributes.send_time ?? "",
    status: c.attributes.status,
  }));
}

export type FlowMessageMetrics = {
  flowMessageId: string;
  openRate: number;
  clickRate: number;
  revenuePerRecipient: number;
};

// query-flow-values is the closest thing Klaviyo exposes for per-flow-message
// metrics. We surface a best-effort number; if the endpoint shape changes,
// this falls back to zeros and the analyze prompt notes "no metrics".
export async function getFlowMetrics(flowId: string, days = 60): Promise<FlowMessageMetrics[]> {
  void days;
  void flowId;
  // Placeholder — Klaviyo's metric aggregation API requires per-metric filters
  // that vary by account. Real implementation needs the customer's specific
  // metric ids (Opened Email, Clicked Email, Placed Order). For v1 we return
  // an empty array and the analyze prompt skips metrics gracefully.
  return [];
}

// --- Public write API -------------------------------------------------------

export type CloneTemplateInput = {
  templateId: string;
  edits?: { name?: string; html?: string; text?: string };
};

type KCloneTemplateResponse = { data: { id: string; attributes: { name: string } } };

export async function cloneTemplate(input: CloneTemplateInput): Promise<{ id: string; name: string }> {
  if (!hasWriteAccess()) throw new KlaviyoAuthError("Write key not configured");
  const cloneRes = await klaviyoFetch<KCloneTemplateResponse>(`/templates/${input.templateId}/clone/`, {
    method: "POST",
    useWriteKey: true,
    body: { data: { type: "template", attributes: { name: input.edits?.name ?? `Lunia review draft ${new Date().toISOString().slice(0, 10)}` } } },
  });
  const newId = cloneRes.data.id;
  if (input.edits?.html || input.edits?.text) {
    await klaviyoFetch(`/templates/${newId}/`, {
      method: "PATCH",
      useWriteKey: true,
      body: {
        data: {
          type: "template",
          id: newId,
          attributes: {
            ...(input.edits.html !== undefined ? { html: input.edits.html } : {}),
            ...(input.edits.text !== undefined ? { text: input.edits.text } : {}),
          },
        },
      },
    });
  }
  return { id: newId, name: cloneRes.data.attributes.name };
}

export async function swapFlowMessageTemplate(flowMessageId: string, newTemplateId: string): Promise<void> {
  if (!hasWriteAccess()) throw new KlaviyoAuthError("Write key not configured");
  await klaviyoFetch(`/flow-messages/${flowMessageId}/relationships/template/`, {
    method: "PATCH",
    useWriteKey: true,
    body: { data: { type: "template", id: newTemplateId } },
  });
}

// Klaviyo deep-link to the template editor (so the user can publish manually).
export function klaviyoTemplateEditorUrl(templateId: string): string {
  return `https://www.klaviyo.com/template/${templateId}`;
}

// --- Audit log --------------------------------------------------------------

export type WritebackAuditEntry = {
  ts: string;
  action: "clone_template" | "swap_template";
  flowMessageId?: string;
  templateId?: string;
  newTemplateId?: string;
  status: "success" | "error";
  errorMessage?: string;
};

export async function logWriteback(entry: WritebackAuditEntry): Promise<void> {
  const day = entry.ts.slice(0, 10);
  const key = `klaviyo_writes:${day}`;
  try {
    const list = (await kv.get<WritebackAuditEntry[]>(key)) ?? [];
    list.push(entry);
    await kv.set(key, list, { ex: 60 * 60 * 24 * 90 }); // 90 day retention
  } catch { /* best-effort */ }
}
