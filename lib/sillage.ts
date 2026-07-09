// Client Sillage REST v2 — voir docs/sillage.md pour l'état du workspace.
const BASE = "https://api.getsillage.com/api";

function headers() {
  return {
    Authorization: `Bearer ${process.env.SILLAGE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export type SillageDetection = {
  id: number;
  type: string; // newJob | recentlyPromoted | keywordDetection | jobPostingKeywordDetection | ...
  [k: string]: unknown;
};

export async function querySignals(opts: { limit?: number; cursor?: string; types?: string[] } = {}) {
  const body: Record<string, unknown> = { limit: opts.limit ?? 25 };
  if (opts.cursor) body.cursor = opts.cursor;
  if (opts.types?.length) body.type = opts.types;
  const res = await fetch(`${BASE}/v2/workspace/signals/query`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sillage signals/query ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ data: SillageDetection[]; meta: { next_cursor: string | null; has_more: boolean } }>;
}

export async function listTopAccounts() {
  const res = await fetch(`${BASE}/v2/top-account-list/accounts?page_size=25`, { headers: headers() });
  if (!res.ok) throw new Error(`Sillage top-accounts ${res.status}`);
  return res.json();
}

// Mapping type Sillage -> type table `signals`
export function mapSignalType(t: string): string {
  const map: Record<string, string> = {
    newJob: "job_change",
    recentlyPromoted: "promotion",
    jobPostingKeywordDetection: "hiring_intent",
    keywordDetection: "keyword",
  };
  return map[t] ?? t;
}
