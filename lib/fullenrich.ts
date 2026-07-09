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
  const res = await fetch(`${BASE}/contact/enrich/bulk`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `madeleine-${c.firstname}-${c.lastname}`,
      datas: [
        {
          firstname: c.firstname,
          lastname: c.lastname,
          domain: c.company_domain,
          company_name: c.company_name,
          linkedin_url: c.linkedin_url,
          enrich_fields: ["contact.emails", "contact.phones"],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`FullEnrich enrich ${res.status}: ${await res.text()}`);
  const { enrichment_id } = (await res.json()) as { enrichment_id: string };
  return enrichment_id;
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
