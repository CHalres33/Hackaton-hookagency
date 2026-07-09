#!/usr/bin/env node
// Sync one-shot : deals Pipedrive (pipe 23 Hook Acquisition, owner Kevin) → tables Madeleine.
// Usage : PIPEDRIVE_API_TOKEN=... node scripts/sync-pipedrive.mjs
// La chaleur est calculée sur les VRAIES activités (récence, volume) et le stage réel du deal.

const PD = "https://api.pipedrive.com/api/v2";
const PD1 = "https://api.pipedrive.com/v1";
const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PIPELINE_ID = 23;
const OWNER_ID = 15782877; // Kevin

const STAGE_NAMES = {
  240: "No show", 247: "Suivi LinkedIn", 907: "Nouveau Lead", 2301: "Contacté",
  239: "R1 Programmé", 241: "R1 Fait", 2302: "R1 Validé", 242: "R2 Programmé",
  243: "R2 Fait", 244: "Devis envoyé", 2303: "Verbal Agreement", 245: "Deal closed !",
  2528: "Mathurin leads",
};
// Niveau d'opportunité par stage (0-100)
const STAGE_OPP = { 907: 20, 2301: 25, 247: 25, 239: 45, 240: 10, 241: 55, 2302: 70, 242: 78, 243: 85, 244: 92, 2303: 97, 245: 0, 2528: 15 };

async function pd(path, base = PD) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${base}${path}${sep}api_token=${TOKEN}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function sb(path, method = "GET", body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "resolution=merge-duplicates,return=representation" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : null;
}

function daysAgo(dateStr) {
  if (!dateStr) return 9999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

const main = async () => {
  // 1. Deals ouverts du pipe, owner Kevin
  const deals = [];
  let cursor = "";
  do {
    const r = await pd(`/deals?pipeline_id=${PIPELINE_ID}&owner_id=${OWNER_ID}&status=open&limit=100${cursor ? `&cursor=${cursor}` : ""}`);
    deals.push(...(r.data ?? []));
    cursor = r.additional_data?.next_cursor ?? "";
  } while (cursor);
  console.log(`${deals.length} deals ouverts (pipe ${PIPELINE_ID}, Kevin)`);

  let synced = 0;
  for (const deal of deals) {
    if ([245, 240].includes(deal.stage_id)) continue;
    const personId = deal.person_id?.value ?? deal.person_id;
    if (!personId) continue;

    let person;
    try {
      person = (await pd(`/persons/${personId}`)).data;
    } catch { continue; }

    const orgId = deal.org_id?.value ?? deal.org_id;
    let org = null;
    if (orgId) { try { org = (await pd(`/organizations/${orgId}`)).data; } catch {} }

    // Activités réelles du deal (v1 : liste complète avec done)
    let acts = [];
    try { acts = (await pd(`/deals/${deal.id}/activities?limit=100`, PD1)).data ?? []; } catch {}
    const done = acts.filter((a) => a.done);
    const lastDone = done.sort((a, b) => (b.marked_as_done_time ?? "").localeCompare(a.marked_as_done_time ?? ""))[0];
    const nextOpen = acts.find((a) => !a.done);
    const lastDays = daysAgo(lastDone?.marked_as_done_time ?? deal.update_time);

    // Chaleur réelle : volume d'échanges + récence + next step planifié
    let warmth = Math.min(60, done.length * 8);
    if (lastDays <= 3) warmth += 30; else if (lastDays <= 7) warmth += 22; else if (lastDays <= 21) warmth += 10;
    if (nextOpen) warmth += 10;
    warmth = Math.max(2, Math.min(100, warmth));

    const stageName = STAGE_NAMES[deal.stage_id] ?? `stage ${deal.stage_id}`;
    const opportunity = STAGE_OPP[deal.stage_id] ?? 30;
    const valueEur = deal.value ?? 0;

    const warmthReason = [
      `${done.length} activité${done.length > 1 ? "s" : ""} réalisées`,
      lastDone ? `dernier échange il y a ${lastDays}j` : `pas d'échange récent (maj deal il y a ${lastDays}j)`,
      nextOpen ? `prochaine étape planifiée (${nextOpen.type})` : "aucune next step planifiée",
    ].join(" · ");
    const oppReason = `Stage réel : ${stageName}${valueEur ? ` · ${Math.round(valueEur)}€` : ""} · deal ouvert depuis ${daysAgo(deal.add_time)}j`;

    // Upsert account
    let accountId = null;
    if (org?.name) {
      const domain = `pd-org-${orgId}`;
      const [acc] = await sb(`accounts?on_conflict=domain`, "POST", [{ name: org.name, domain, tier: valueEur > 8000 ? 1 : 2, origin: "pipedrive" }]);
      accountId = acc?.id ?? null;
    }

    const [first, ...rest] = (person.name ?? "Prospect Pipedrive").split(" ");
    const email = person.emails?.[0]?.value ?? person.email?.[0]?.value ?? null;
    const phone = person.phones?.[0]?.value ?? person.phone?.[0]?.value ?? null;

    // Contact : dédup par pipedrive_deal_id
    const existing = await sb(`contacts?pipedrive_deal_id=eq.${deal.id}&select=id`);
    let contactId;
    if (existing.length) {
      contactId = existing[0].id;
      await sb(`contacts?id=eq.${contactId}`, "PATCH", {
        deal_stage: stageName, deal_value_eur: valueEur,
      });
    } else {
      const [c] = await sb("contacts", "POST", [{
        firstname: first, lastname: rest.join(" ") || "—",
        account_id: accountId, origin: "pipedrive", pipedrive_deal_id: deal.id,
        deal_stage: stageName, deal_value_eur: valueEur,
        email, email_status: email ? "found" : "pending",
        phone, phone_status: phone ? "found" : "pending",
      }]);
      contactId = c.id;
    }

    // Événements de relation = les vraies activités du deal (pour timeline + résumé)
    await sb(`relationship_events?contact_id=eq.${contactId}&source=eq.crm`, "DELETE");
    const evts = done.slice(0, 15).map((a) => ({
      contact_id: contactId,
      source: "crm",
      direction: "outbound",
      occurred_at: a.marked_as_done_time ?? a.due_date ?? deal.update_time,
      weight: 1,
      payload: { summary: `${a.type}: ${a.subject ?? ""}`.slice(0, 200), note: (a.note ?? "").replace(/<[^>]+>/g, " ").slice(0, 500) },
    }));
    if (evts.length) await sb("relationship_events", "POST", evts);

    // Relationship upsert
    await sb(`relationships?on_conflict=contact_id`, "POST", [{
      contact_id: contactId, warmth, opportunity,
      warmth_reason: warmthReason, opportunity_reason: oppReason,
      level: warmth >= 70 ? "champion" : warmth >= 45 ? "connexion" : warmth >= 20 ? "contact" : "inconnu",
      xp: done.length * 10,
    }]);

    synced++;
    console.log(`✓ ${person.name} — ${stageName} — chaleur ${warmth} (${warmthReason})`);
  }
  console.log(`\n${synced} prospects Pipedrive synchronisés.`);
};

main().catch((e) => { console.error(e); process.exit(1); });
