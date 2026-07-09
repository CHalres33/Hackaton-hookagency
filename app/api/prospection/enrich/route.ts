import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enrichAndWait } from "@/lib/fullenrich";

export const maxDuration = 300;

// POST /api/prospection/enrich  body: { contact_id?: number, all_missing?: boolean, limit?: number }
// Enrichit les contacts (email + tél + infos pro) via FullEnrich et remplit la fiche.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  let contacts: Array<{ id: number; firstname: string; lastname: string; linkedin_url: string | null; account_id: number | null; job_title: string | null; city: string | null; country: string | null }> = [];
  if (body.contact_id) {
    const { data } = await db.from("contacts").select("id,firstname,lastname,linkedin_url,account_id,job_title,city,country").eq("id", body.contact_id);
    contacts = data ?? [];
  } else {
    // Par défaut : les contacts sans email trouvé
    const { data } = await db
      .from("contacts")
      .select("id,firstname,lastname,linkedin_url,account_id,job_title,city,country")
      .eq("email_status", "pending")
      .limit(body.limit ?? 5);
    contacts = data ?? [];
  }

  const results: Array<Record<string, unknown>> = [];
  for (const c of contacts) {
    const { data: acc } = c.account_id
      ? await db.from("accounts").select("domain,name").eq("id", c.account_id).maybeSingle()
      : { data: null };
    try {
      const r = await enrichAndWait({
        firstname: c.firstname,
        lastname: c.lastname,
        company_domain: acc?.domain,
        company_name: acc?.name,
        linkedin_url: c.linkedin_url ?? undefined,
      });
      const first = (r as { datas?: Array<{ contact?: {
        emails?: Array<{ email: string }>; phones?: Array<{ number: string }>;
        current_title?: string; current_company_name?: string;
        location?: { city?: string; country?: string };
        employment?: { current?: { title?: string; company?: { name?: string; domain?: string } } };
      } }> }).datas?.[0];
      const ct = first?.contact;
      const email = ct?.emails?.[0]?.email;
      const phone = ct?.phones?.[0]?.number;
      const title = ct?.current_title ?? ct?.employment?.current?.title;
      const city = ct?.location?.city;
      const country = ct?.location?.country;
      const companyName = ct?.current_company_name ?? ct?.employment?.current?.company?.name;
      const companyDomain = ct?.employment?.current?.company?.domain;

      let accountId = c.account_id;
      if (!accountId && (companyDomain || companyName)) {
        const { data: a } = await db.from("accounts")
          .upsert({ domain: companyDomain ?? `${companyName}`.toLowerCase().replace(/\s+/g, "-") + ".unknown", name: companyName ?? companyDomain }, { onConflict: "domain" })
          .select("id").single();
        accountId = a?.id ?? null;
      }

      await db.from("contacts").update({
        email: email ?? null, email_status: email ? "found" : "failed",
        phone: phone ?? null, phone_status: phone ? "found" : "failed",
        job_title: title ?? c.job_title, city: city ?? c.city, country: country ?? c.country,
        account_id: accountId,
      }).eq("id", c.id);

      results.push({ contact_id: c.id, name: `${c.firstname} ${c.lastname}`, email: email ?? "—", phone: phone ?? "—", job_title: title ?? "—" });
    } catch (e) {
      results.push({ contact_id: c.id, error: String(e) });
    }
  }
  return NextResponse.json({ enriched: results.length, results });
}
