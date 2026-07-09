import { supabaseAdmin } from "@/lib/supabase";
import { searchPeople } from "@/lib/fullenrich";

const SILLAGE_BASE = "https://api.getsillage.com/api";
const CHAMPION_WATCHLIST = { kind: "profile", id: 22 };

export async function scanMarket(opts: {
  titles?: string[];
  domains?: string[];
  locations?: string[];
  limit?: number;
}) {
  const db = supabaseAdmin();
  let domains = opts.domains;
  if (!domains?.length) {
    const { data } = await db.from("accounts").select("domain").limit(20);
    domains = (data ?? []).map((a) => a.domain);
  }
  const result = await searchPeople({
    titles: opts.titles ?? ["Head of Sales", "VP Sales", "Chief Revenue Officer", "Head of Growth"],
    domains,
    locations: opts.locations ?? ["Paris"],
    limit: opts.limit ?? 10,
  });
  const people = result.people ?? [];
  const created: Array<Record<string, unknown>> = [];
  const linkedinUrls: string[] = [];

  for (const p of people) {
    if (!p.first_name || !p.last_name) continue;
    const domain = p.employment?.current?.company?.domain;
    let accountId: number | null = null;
    if (domain) {
      const { data: acc } = await db
        .from("accounts")
        .upsert({ domain, name: p.employment?.current?.company?.name ?? domain }, { onConflict: "domain" })
        .select("id")
        .single();
      accountId = acc?.id ?? null;
    }
    const linkedin = p.social_profiles?.professional_network?.url;
    const { data: existing } = await db
      .from("contacts").select("id").eq("firstname", p.first_name).eq("lastname", p.last_name).maybeSingle();
    if (existing) continue;
    const { data: contact } = await db
      .from("contacts")
      .insert({
        account_id: accountId,
        firstname: p.first_name,
        lastname: p.last_name,
        job_title: p.employment?.current?.title,
        city: p.location?.city,
        country: p.location?.country,
        linkedin_url: linkedin,
      })
      .select("id").single();
    if (contact) {
      created.push({ contact_id: contact.id, name: p.full_name, title: p.employment?.current?.title, company: p.employment?.current?.company?.name, linkedin_url: linkedin });
      if (linkedin) linkedinUrls.push(linkedin);
    }
  }

  let sillage: unknown = null;
  if (linkedinUrls.length) {
    const res = await fetch(`${SILLAGE_BASE}/v2/watchlists/${CHAMPION_WATCHLIST.kind}/${CHAMPION_WATCHLIST.id}/entities`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SILLAGE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ entities: linkedinUrls.map((u) => ({ linkedin_url: u })) }),
    });
    sillage = res.ok ? { tracked: linkedinUrls.length } : { error: (await res.text()).slice(0, 200) };
  }

  return { credits_used: result.credits, found: people.length, created, sillage_champions: sillage };
}
