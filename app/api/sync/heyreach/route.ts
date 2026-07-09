import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getConversations, linkedinSlug } from "@/lib/heyreach";

export const maxDuration = 120;

// POST /api/sync/heyreach — conversations LinkedIn -> relationship_events + recalcul de la chaleur.
// Matching : slug LinkedIn d'abord, sinon prénom+nom.
export async function POST() {
  const db = supabaseAdmin();
  const { data: contacts } = await db.from("contacts").select("id, firstname, lastname, linkedin_url");
  if (!contacts?.length) return NextResponse.json({ matched: 0 });

  const bySlug = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const c of contacts) {
    const slug = linkedinSlug(c.linkedin_url);
    if (slug) bySlug.set(slug, c.id);
    byName.set(`${c.firstname} ${c.lastname}`.toLowerCase(), c.id);
  }

  let offset = 0;
  let matched = 0;
  const touched = new Set<number>();

  for (let page = 0; page < 5; page++) {
    const { items, totalCount } = await getConversations(offset, 100);
    for (const conv of items) {
      const p = conv.correspondentProfile;
      const contactId =
        bySlug.get(linkedinSlug(p?.profileUrl) ?? "") ??
        byName.get(`${p?.firstName ?? ""} ${p?.lastName ?? ""}`.toLowerCase());
      if (!contactId) continue;

      // dédup par conversation
      const { data: existing } = await db
        .from("relationship_events")
        .select("id")
        .eq("contact_id", contactId)
        .eq("payload->>heyreach_id", conv.id)
        .maybeSingle();
      if (existing) continue;

      await db.from("relationship_events").insert({
        contact_id: contactId,
        source: "linkedin",
        direction: conv.lastMessageSender === "CORRESPONDENT" ? "inbound" : "outbound",
        occurred_at: conv.lastMessageAt ?? new Date().toISOString(),
        weight: Math.min(5, 1 + (conv.totalMessages ?? 1) / 4),
        payload: { heyreach_id: conv.id, total_messages: conv.totalMessages },
      });
      matched++;
      touched.add(contactId);
    }
    offset += 100;
    if (offset >= totalCount) break;
  }

  // Recalcul de la chaleur pour les contacts touchés :
  // base 20 + 10/conversation (cap 40) + 25 si inbound récent (<14j) + 2/message (cap 15)
  for (const contactId of touched) {
    const { data: events } = await db
      .from("relationship_events")
      .select("direction, occurred_at, weight, payload")
      .eq("contact_id", contactId)
      .eq("source", "linkedin");
    if (!events?.length) continue;
    const conversations = events.length;
    const recentInbound = events.some(
      (e) => e.direction === "inbound" && Date.now() - new Date(e.occurred_at).getTime() < 14 * 864e5,
    );
    const totalMsgs = events.reduce((s, e) => s + Number((e.payload as { total_messages?: number })?.total_messages ?? 1), 0);
    const warmth = Math.min(95, 20 + Math.min(40, conversations * 10) + (recentInbound ? 25 : 0) + Math.min(15, totalMsgs * 2));
    const level = warmth >= 75 ? "champion" : warmth >= 50 ? "connexion" : warmth >= 30 ? "contact" : "inconnu";
    await db.from("relationships").upsert({ contact_id: contactId, warmth, level, updated_at: new Date().toISOString() });
  }

  return NextResponse.json({ matched, contacts_updated: touched.size });
}
