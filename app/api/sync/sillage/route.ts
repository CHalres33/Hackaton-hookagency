import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { querySignals, mapSignalType } from "@/lib/sillage";

// POST /api/sync/sillage — tire les détections live Sillage vers la table signals (dédup sur payload.sillage_id)
export async function POST() {
  const db = supabaseAdmin();
  let synced = 0;
  try {
    const res = await querySignals({ limit: 50 });
    for (const d of res.data) {
      const sillageId = `sillage-${d.id}`;
      const { data: existing } = await db
        .from("signals")
        .select("id")
        .eq("payload->>sillage_id", sillageId)
        .maybeSingle();
      if (existing) continue;

      // rattacher au compte si le domaine matche
      const companyDomain =
        (d as { company?: { domain?: string } }).company?.domain ??
        (d as { account?: { domain?: string } }).account?.domain;
      let accountId: number | null = null;
      if (companyDomain) {
        const { data: acc } = await db.from("accounts").select("id").eq("domain", companyDomain).maybeSingle();
        accountId = acc?.id ?? null;
      }

      const type = mapSignalType(d.type);
      const score = type === "job_change" || type === "promotion" ? 70 : type === "hiring_intent" ? 60 : 50;
      await db.from("signals").insert({
        type,
        source: "sillage",
        payload: { ...d, sillage_id: sillageId },
        score,
        confidence: 0.8,
        account_id: accountId,
        status: "new",
      });
      synced++;
    }
    return NextResponse.json({ synced, live_total: res.data.length });
  } catch (e) {
    return NextResponse.json({ synced, error: String(e) }, { status: 502 });
  }
}
