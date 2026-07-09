// Client FullEnrich API v2 — docs: https://docs.fullenrich.com/api/v2/general/introduction
// Enrichissement asynchrone : POST bulk -> poll résultats.
const BASE = "https://app.fullenrich.com/api/v2";

function headers() {
  return {
    Authorization: `Bearer ${process.env.FULLENRICH_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function enrichContact(c: {
  firstname: string;
  lastname: string;
  company_domain?: string;
  company_name?: string;
  linkedin_url?: string;
}) {
  // Écarter les domaines bidons (ex. fallback "*.unknown") que FullEnrich rejette
  const validDomain =
    c.company_domain && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(c.company_domain) && !c.company_domain.endsWith(".unknown")
      ? c.company_domain
      : undefined;
  const res = await fetch(`${BASE}/contact/enrich/bulk`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `madeleine-${c.firstname}-${c.lastname}`,
      data: [
        {
          first_name: c.firstname,
          last_name: c.lastname,
          domain: validDomain,
          company_name: c.company_name,
          linkedin_url: c.linkedin_url,
          enrich_fields: ["contact.work_emails", "contact.personal_emails", "contact.phones"],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`FullEnrich enrich ${res.status}: ${await res.text()}`);
  const { enrichment_id } = (await res.json()) as { enrichment_id: string };
  return enrichment_id;
}

// Extrait email + téléphone de la réponse d'enrichissement (forme réelle: datas[].contact_info)
export function parseEnrichmentItem(result: unknown): { email?: string; phone?: string } {
  const r = result as { datas?: unknown[]; data?: unknown[] };
  const item = (r.datas?.[0] ?? r.data?.[0]) as
    | {
        contact_info?: {
          most_probable_work_email?: { email?: string };
          most_probable_phone?: { number?: string };
          work_emails?: Array<{ email?: string }>;
          personal_emails?: Array<{ email?: string }>;
          phones?: Array<{ number?: string }>;
        };
      }
    | undefined;
  const ci = item?.contact_info;
  return {
    email: ci?.most_probable_work_email?.email ?? ci?.work_emails?.[0]?.email ?? ci?.personal_emails?.[0]?.email,
    phone: ci?.most_probable_phone?.number ?? ci?.phones?.[0]?.number,
  };
}

export async function getEnrichment(enrichmentId: string) {
  const res = await fetch(`${BASE}/contact/enrich/bulk/${enrichmentId}`, { headers: headers() });
  if (!res.ok) throw new Error(`FullEnrich results ${res.status}`);
  return res.json();
}

// Poll jusqu'à FINISHED (max ~60s) — pour la tranche verticale de la démo.
export async function enrichAndWait(c: Parameters<typeof enrichContact>[0], timeoutMs = 60000) {
  const id = await enrichContact(c);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 4000));
    const data = (await getEnrichment(id)) as { status?: string; datas?: unknown[] };
    if (data.status === "FINISHED") return data;
  }
  return { status: "TIMEOUT", enrichment_id: id };
}

// --- Search People (scan de marché) ---
export type SearchFilter = { value: string; exact_match?: boolean; exclude?: boolean };

export async function searchPeople(opts: {
  titles?: string[];
  domains?: string[];
  locations?: string[];
  limit?: number;
  offset?: number;
}) {
  const body: Record<string, unknown> = {
    offset: opts.offset ?? 0,
    limit: Math.min(opts.limit ?? 20, 50),
  };
  if (opts.titles?.length) body.current_position_titles = opts.titles.map((v) => ({ value: v }));
  if (opts.domains?.length) body.current_company_domains = opts.domains.map((v) => ({ value: v, exact_match: true }));
  if (opts.locations?.length) body.person_locations = opts.locations.map((v) => ({ value: v }));
  const res = await fetch(`${BASE}/people/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`FullEnrich search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<{
    credits?: number;
    people?: Array<{
      full_name?: string; first_name?: string; last_name?: string;
      location?: { city?: string; country?: string };
      social_profiles?: { professional_network?: { url?: string; handle?: string } };
      employment?: { current?: { title?: string; seniority?: string; company?: { name?: string; domain?: string } } };
    }>;
    [k: string]: unknown;
  }>;
}
