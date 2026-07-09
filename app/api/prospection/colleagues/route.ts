import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { scanMarket } from "@/lib/prospection";

export const maxDuration = 120;

// POST /api/prospection/colleagues  body: { contact_id: number, titles?: string[] }
// Trouve les collègues d'un contact (même entreprise) via FullEnrich, les ajoute au CRM + tracking Sillage.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.contact_id) return NextResponse.json({ error: "contact_id requis" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: c } = await db
    .from("contacts")
    .select("account_id, city, accounts(domain,name)")
    .eq("id", body.contact_id)
    .single();
  const domain = (c?.accounts as { domain?: string } | null)?.domain;
  if (!domain) return NextResponse.json({ error: "pas d'entreprise connue pour ce contact — enrichis-le d'abord" }, { status: 400 });

  try {
    const result = await scanMarket({
      domains: [domain],
      titles: body.titles ?? ["Head", "VP", "Chief", "Director", "Manager", "Lead"],
      locations: c?.city ? [c.city] : undefined,
      limit: body.limit ?? 8,
    });
    return NextResponse.json({ company: (c?.accounts as { name?: string } | null)?.name, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
