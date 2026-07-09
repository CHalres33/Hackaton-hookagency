# Contrat interface ↔ agent (pour le dashboard)

Principe : **le front ne parle jamais à Claude.** Trois points de contact, c'est tout.

```
UI ──(1) POST /api/agent/run──▶ Agent Madeleine (serveur, 1-3 min)
│                                   │ écrit au fil de l'eau
│◀──(2) Supabase Realtime────── signals / actions / passions
└──(3) update status──▶ Supabase (approve / reject)
```

## 1. Déclencher l'agent

```ts
// bouton "Traiter" sur une carte signal
fetch("/api/agent/run", { method: "POST", headers: {"Content-Type":"application/json"},
  body: JSON.stringify({ signal_id: 2 }) });

// bouton "Scanner le prospect" sur une fiche contact
fetch("/api/agent/run", { body: JSON.stringify({ contact_id: 2 }), ... });
```

Ne pas `await` le résultat pour l'UX : la réponse arrive à la fin du run (elle contient `trace`, utile pour un panneau "raisonnement de l'agent"). **Pendant** le run, l'agent insère les `passions` puis l'`action` en base → l'UI les voit arriver en realtime = effet "l'agent travaille sous vos yeux".

## 2. Lire (client supabase-js, URL + clé anon du .env, RLS off)

```ts
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Fil d'actualité (home) — tri score desc, rareté calculée en base
supabase.from("signals").select("*, accounts(name,domain,logo_url,tier), contacts(firstname,lastname,job_title)")
  .eq("status","new").order("score",{ascending:false});

// File de validation
supabase.from("actions").select("*, contacts(firstname,lastname,job_title), passions(value,proof,source_url)")
  .eq("status","proposed").order("created_at",{ascending:false});

// Fiche prospect
supabase.from("contacts").select("*, accounts(*), passions(*), relationships(*)").eq("id", id).single();

// Realtime (publication activée sur signals + actions)
supabase.channel("feed")
  .on("postgres_changes",{event:"*",schema:"public",table:"signals"}, refetch)
  .on("postgres_changes",{event:"*",schema:"public",table:"actions"}, refetch)
  .subscribe();
```

## 3. Approuver / rejeter (file de validation)

```ts
await supabase.from("actions").update({ status: "approved" }).eq("id", actionId);
// approved → déclenchera l'envoi Handwrytten (route /api/actions/send, à venir)
```

## Données de démo déjà en base

- 20 comptes (les trackés Sillage, avec tier), 20 contacts
- Contacts vitrines : **1 = Arnaud Weiss**, **2 = Arthur Coudouy**, **3 = Benjamin Douablin** (passions pré-scannées avec preuves + sources)
- 6 signaux `new` dont un **légendaire** (score 90, pré-seed Sillage) — `rarity` est calculé : commun < 60 ≤ rare < 85 ≤ legendaire
- `game_state` (id=1) : team_xp, streak, badges — à incrémenter côté front à l'approve

## Champs qui font la démo

Sur une carte de validation, afficher absolument : `actions.justification` (le raisonnement signal × chaleur × passion × creep-safety — c'est ce que le jury lit), `gift_name` + `gift_url` + `gift_price_eur`, et le `message` rendu en style manuscrit.
