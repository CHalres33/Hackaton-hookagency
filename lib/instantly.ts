// Instantly v2 — campagnes cold email. La brique "email" de l'échelle d'escalade.
const BASE = "https://api.instantly.ai/api/v2";

function headers() {
  return {
    Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function listCampaigns(limit = 20) {
  const res = await fetch(`${BASE}/campaigns?limit=${limit}`, { headers: headers() });
  if (!res.ok) throw new Error(`Instantly campaigns ${res.status}`);
  const json = (await res.json()) as { items?: Array<{ id: string; name: string; status: number }> };
  return json.items ?? [];
}

// Ajoute un lead à une campagne (avec le message personnalisé de Madeleine en custom variable).
export async function addLeadToCampaign(opts: {
  campaignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  personalizedMessage?: string;
}) {
  const res = await fetch(`${BASE}/leads`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      campaign: opts.campaignId,
      email: opts.email,
      first_name: opts.firstName,
      last_name: opts.lastName,
      company_name: opts.companyName,
      // Message rédigé par Madeleine, injectable via {{madeleine_message}} dans la séquence
      custom_variables: opts.personalizedMessage ? { madeleine_message: opts.personalizedMessage } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Instantly addLead ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<{ id: string; email: string }>;
}
