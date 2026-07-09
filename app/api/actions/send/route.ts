import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/actions/send  body: { action_id: number }
// Approuve une action et, si c'est une carte manuscrite, l'envoie via Handwrytten.
export async function POST(req: NextRequest) {
  const { action_id } = await req.json().catch(() => ({}));
  if (!action_id) return NextResponse.json({ error: "action_id requis" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: action } = await db
    .from("actions")
    .select("*, contacts(firstname,lastname,postal_address)")
    .eq("id", action_id)
    .single();
  if (!action) return NextResponse.json({ error: "action inconnue" }, { status: 404 });

  let handwryttenOrderId: string | null = null;

  if (action.channel === "carte_manuscrite" && process.env.HANDWRYTTEN_API_KEY) {
    // Handwrytten singleStepOrder — mode démo : carte par défaut, adresse bureau du contact.
    const res = await fetch("https://api.handwrytten.com/v1/orders/singleStepOrder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HANDWRYTTEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        card_id: process.env.HANDWRYTTEN_CARD_ID ?? "1",
        message: action.message,
        recipient_name: `${action.contacts?.firstname} ${action.contacts?.lastname}`,
        address1: action.contacts?.postal_address ?? "Station F, 5 Parvis Alan Turing",
        city: "Paris",
        zip: "75013",
        country: "France",
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: "Handwrytten a refusé", detail: body }, { status: 502 });
    }
    handwryttenOrderId = String(body.order_id ?? body.id ?? "");
  }

  const { error } = await db
    .from("actions")
    .update({
      status: handwryttenOrderId ? "sent" : "approved",
      handwrytten_order_id: handwryttenOrderId,
    })
    .eq("id", action_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Gamification : +XP équipe à chaque action validée
  await db.rpc("increment_team_xp", { amount: 50 }).then(
    () => {},
    () => {}, // rpc absente = pas bloquant
  );

  return NextResponse.json({ status: handwryttenOrderId ? "sent" : "approved", handwrytten_order_id: handwryttenOrderId });
}
