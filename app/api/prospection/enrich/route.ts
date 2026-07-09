import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enrichAndWait, parseEnrichmentItem } from "@/lib/fullenrich";

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
      const { email, phone } = parseEnrichmentItem(r);
      await db.from("contacts").update({
        email: email ?? null, email_status: email ? "found" : "failed",
        phone: phone ?? null, phone_status: phone ? "found" : "failed",
      }).eq("id", c.id);
      results.push({ contact_id: c.id, name: `${c.firstname} ${c.lastname}`, email: email ?? "—", phone: phone ?? "—" });
    } catch (e) {
      results.push({ contact_id: c.id, error: String(e) });
    }
  }
  return NextResponse.json({ enriched: results.length, results });
}
