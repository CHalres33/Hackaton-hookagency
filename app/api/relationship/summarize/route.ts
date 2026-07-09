import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

// POST /api/relationship/summarize  body: { contact_id }
// Résume les échanges (LinkedIn + mail + CRM) et explique la chaleur, en 2-3 phrases chacun.
export async function POST(req: NextRequest) {
  const { contact_id } = await req.json();
  if (!contact_id) return NextResponse.json({ error: "contact_id requis" }, { status: 400 });

  const db = supabaseAdmin();
  const [{ data: contact }, { data: events }, { data: rel }] = await Promise.all([
    db.from("contacts").select("*, accounts(name)").eq("id", contact_id).single(),
    db
      .from("relationship_events")
      .select("source, direction, occurred_at, payload")
      .eq("contact_id", contact_id)
      .order("occurred_at", { ascending: true })
      .limit(40),
    db.from("relationships").select("*").eq("contact_id", contact_id).maybeSingle(),
  ]);
  if (!contact) return NextResponse.json({ error: "contact inconnu" }, { status: 404 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: process.env.MADELEINE_MODEL ?? "claude-sonnet-5",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Historique d'échanges avec ${contact.firstname} ${contact.lastname} (${contact.job_title ?? "?"} chez ${contact.accounts?.name ?? "?"}${contact.deal_stage ? `, deal au stage "${contact.deal_stage}"` : ""}) :
${JSON.stringify(events ?? [], null, 1)}

Chaleur actuelle : ${rel?.warmth ?? 0}/100${rel?.warmth_reason ? ` (${rel.warmth_reason})` : ""}.

Réponds en JSON strict {"conversation_summary": "...", "warmth_reason": "..."} :
- conversation_summary : 2-3 phrases en français qui résument CONCRÈTEMENT où en est la conversation (canaux utilisés, sujets abordés d'après les notes, dernier échange, ton général). Pas de blabla, du factuel utile à un SDR qui reprend le fil.
- warmth_reason : 1-2 phrases expliquant POURQUOI ce prospect est chaud/tiède/froid (fréquence, récence, réciprocité, stage). Pas de tirets longs.`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  let parsed: { conversation_summary?: string; warmth_reason?: string } = {};
  try {
    parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return NextResponse.json({ error: "parse", raw: text }, { status: 500 });
  }

  await db
    .from("relationships")
    .upsert(
      {
        contact_id,
        warmth: rel?.warmth ?? 0,
        conversation_summary: parsed.conversation_summary,
        warmth_reason: parsed.warmth_reason ?? rel?.warmth_reason,
      },
      { onConflict: "contact_id" }
    );

  return NextResponse.json(parsed);
}
