// Envoi réel de cartes manuscrites via Handwrytten (https://www.handwrytten.com/api)
// Doc : POST /orders/singleStepOrder — crée et envoie une carte en un appel.

const BASE = "https://api.handwrytten.com/v1";

export async function sendHandwrittenCard(opts: {
  message: string;
  recipientName: string;
  address1: string;
  city: string;
  zip: string;
  country?: string;
}): Promise<{ orderId: string } | { error: string }> {
  const key = process.env.HANDWRYTTEN_API_KEY;
  if (!key) return { error: "HANDWRYTTEN_API_KEY manquante : envoi simulé" };

  const res = await fetch(`${BASE}/orders/singleStepOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      card_id: 128, // carte blanche standard ; à ajuster selon le catalogue du compte
      message: opts.message,
      recipient: {
        name: opts.recipientName,
        address1: opts.address1,
        city: opts.city,
        zip: opts.zip,
        country: opts.country ?? "France",
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: `Handwrytten ${res.status}: ${JSON.stringify(data)}` };
  return { orderId: String(data.order_id ?? data.id ?? "ok") };
}
