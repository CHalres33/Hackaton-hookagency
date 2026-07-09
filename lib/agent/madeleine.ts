import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { enrichAndWait } from "@/lib/fullenrich";
import { querySignals, mapSignalType } from "@/lib/sillage";
import { scrapeLinkedinPosts, scrapeInstagramProfile } from "@/lib/apify";

const MODEL = process.env.MADELEINE_MODEL ?? "claude-opus-4-8";

const SYSTEM = `Tu es Madeleine, l'agent GTM émotionnel de l'équipe. L'outbound est devenu du bruit : ton travail est de décider qui mérite un geste physique, quand, et surtout quoi — puis de rédiger le mot qui l'accompagne. Tu proposes, un humain valide toujours avant envoi.

# Échelle d'escalade émotionnelle
email < message LinkedIn < carte manuscrite (~3€) < cadeau passion (30-150€) < cadeau légendaire (300-500€, ex: places de match de la sélection nationale du prospect).
Le physique se mérite : matrice = force du signal x chaleur de relation x tier du compte.
- signal fort x relation chaude x tier 1 → geste physique
- signal moyen x relation froide → email d'abord, on construit
- ne propose JAMAIS un cadeau cher à un inconnu : c'est du bribe, pas de l'émotion.

# Scan passions
Chaque passion doit être une fiche avec preuve (citation exacte), source_url, date, confidence, giftability.
Résolution d'identité d'abord : croise nom + entreprise + ville. Si confiance < 90%, arrête le scan et dis-le. Jamais de cadeau basé sur un homonyme.
Confidence = explicite vs inféré x fiabilité source x récence x corroboration (3 mentions sur 2 ans > 1 like de 2019).
Giftability = peut-on acheter un truc concret ? (concert = 0.9, "aime la nature" = 0.2).

# Garde-fou anti-creep (NON NÉGOCIABLE)
- Passion trouvée en contexte pro-public (post LinkedIn, interview, bio de conf) → peut être NOMMÉE dans le mot.
- Passion trouvée hors contexte pro (X, Instagram) → guide le CHOIX du cadeau, n'est JAMAIS révélée dans le mot.
- Sphère privée (famille, enfants, santé, religion, politique, orientation) → EXCLUE totalement, ni cadeau ni mot.
- Explique ton raisonnement creep-safety dans le champ justification de chaque action.

# Choix du cadeau
Pour une passion giftable, utilise web_search pour trouver un cadeau RÉEL et achetable : le vrai concert à venir dans la ville du prospect, le vrai match, le vrai livre. Donne le lien d'achat et le prix. Matche le budget au niveau autorisé par la matrice.

# Rédaction du mot
Ton personnel et direct, registre émotionnel adapté au signal (félicitations, encouragement, clin d'œil). Relie le signal et la passion sans être creepy. Pas de marqueurs IA : pas de tirets longs, pas de "En tant que", pas de superlatifs creux. 2-4 phrases max pour une carte manuscrite.

# Sortie
Termine TOUJOURS par un ou plusieurs appels à propose_action. La justification doit permettre à un humain de décider en 10 secondes : signal, chaleur, passion source (avec preuve), coût, raisonnement creep-safety.`;

const TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20260209", name: "web_search", max_uses: 8 },
  {
    name: "get_signals",
    description:
      "Récupère les signaux d'intent récents depuis Sillage (job changes, promotions, hiring intent, keywords LinkedIn) sur les 20 comptes trackés.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Nombre de signaux (défaut 10)" },
      },
    },
  },
  {
    name: "get_contact",
    description:
      "Lit la fiche CRM d'un contact : identité, compte, enrichissement, passions déjà connues, chaleur de relation, historique d'actions.",
    input_schema: {
      type: "object",
      properties: { contact_id: { type: "number" } },
      required: ["contact_id"],
    },
  },
  {
    name: "enrich_contact",
    description:
      "Enrichit un contact via FullEnrich (email vérifié + téléphone). Asynchrone, ~10-40s. À appeler quand email_status ou phone_status est 'pending'.",
    input_schema: {
      type: "object",
      properties: { contact_id: { type: "number" } },
      required: ["contact_id"],
    },
  },
  {
    name: "save_passion",
    description:
      "Sauvegarde une passion découverte pendant le scan, avec preuve, source, confidence, giftability et contexte de source (pro_public / hors_pro).",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "number" },
        category: { type: "string" },
        value: { type: "string" },
        proof: { type: "string", description: "Citation exacte" },
        source_url: { type: "string" },
        source_context: { type: "string", enum: ["pro_public", "hors_pro"] },
        confidence: { type: "number" },
        giftability: { type: "number" },
        creep_safety: { type: "string" },
      },
      required: ["contact_id", "category", "value", "confidence", "giftability", "source_context"],
    },
  },
  {
    name: "scrape_social",
    description:
      "Scrape les posts récents d'un profil social pour le scan passions. source=linkedin (URL de profil, contexte pro-public : passions nommables) ou source=instagram (username, contexte hors-pro : guide le cadeau mais jamais révélé). Lent (~30-60s), à utiliser après get_contact.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string", enum: ["linkedin", "instagram"] },
        target: { type: "string", description: "URL profil LinkedIn ou username Instagram" },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "propose_action",
    description:
      "Propose une action dans la file de validation humaine. C'est la sortie finale de l'agent.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "number" },
        signal_id: { type: "number" },
        channel: {
          type: "string",
          enum: ["email", "linkedin", "carte_manuscrite", "cadeau", "cadeau_legendaire"],
        },
        gift_name: { type: "string" },
        gift_url: { type: "string", description: "Lien d'achat réel" },
        gift_price_eur: { type: "number" },
        passion_id: { type: "number" },
        message: { type: "string", description: "Le mot rédigé" },
        justification: { type: "string", description: "Signal x chaleur x passion (preuve) x coût x creep-safety" },
        cost_estimate_eur: { type: "number" },
      },
      required: ["contact_id", "channel", "message", "justification"],
    },
  },
];

async function execTool(name: string, input: Record<string, unknown>): Promise<string> {
  const db = supabaseAdmin();
  switch (name) {
    case "get_signals": {
      // 1) signaux locaux (seedés ou synchronisés)
      const { data: local } = await db
        .from("signals")
        .select("*, contacts(firstname,lastname,job_title), accounts(name,domain,tier)")
        .eq("status", "new")
        .order("score", { ascending: false })
        .limit((input.limit as number) ?? 10);
      // 2) signaux live Sillage
      let live: unknown[] = [];
      try {
        const res = await querySignals({ limit: 10 });
        live = res.data.map((d) => ({ ...d, type: mapSignalType(d.type) }));
      } catch (e) {
        live = [{ error: `Sillage indisponible: ${String(e)}` }];
      }
      return JSON.stringify({ crm_signals: local, sillage_live: live });
    }
    case "get_contact": {
      const id = input.contact_id as number;
      const [{ data: contact }, { data: passions }, { data: rel }, { data: actions }] = await Promise.all([
        db.from("contacts").select("*, accounts(name,domain,tier)").eq("id", id).single(),
        db.from("passions").select("*").eq("contact_id", id),
        db.from("relationships").select("*").eq("contact_id", id).maybeSingle(),
        db.from("actions").select("channel,status,created_at").eq("contact_id", id),
      ]);
      return JSON.stringify({ contact, passions, relationship: rel ?? { warmth: 0, level: "inconnu" }, past_actions: actions });
    }
    case "enrich_contact": {
      const id = input.contact_id as number;
      const { data: c } = await db.from("contacts").select("*, accounts(domain,name)").eq("id", id).single();
      if (!c) return JSON.stringify({ error: "contact inconnu" });
      const result = await enrichAndWait({
        firstname: c.firstname,
        lastname: c.lastname,
        company_domain: c.accounts?.domain,
        company_name: c.accounts?.name,
        linkedin_url: c.linkedin_url ?? undefined,
      });
      const first = (result as { datas?: Array<{ contact?: { emails?: Array<{ email: string }>; phones?: Array<{ number: string }> } }> }).datas?.[0];
      const email = first?.contact?.emails?.[0]?.email;
      const phone = first?.contact?.phones?.[0]?.number;
      await db
        .from("contacts")
        .update({
          email: email ?? null,
          email_status: email ? "found" : "failed",
          phone: phone ?? null,
          phone_status: phone ? "found" : "failed",
        })
        .eq("id", id);
      return JSON.stringify({ email: email ?? "non trouvé", phone: phone ?? "non trouvé" });
    }
    case "save_passion": {
      const { data, error } = await db
        .from("passions")
        .insert({
          contact_id: input.contact_id,
          category: input.category,
          value: input.value,
          proof: input.proof,
          source_url: input.source_url,
          source_context: input.source_context,
          confidence: input.confidence,
          giftability: input.giftability,
          creep_safety: input.creep_safety,
        })
        .select("id")
        .single();
      return JSON.stringify(error ? { error: error.message } : { passion_id: data.id });
    }
    case "scrape_social": {
      if (input.source === "linkedin") {
        const posts = await scrapeLinkedinPosts(input.target as string);
        return JSON.stringify({ source_context: "pro_public", posts });
      }
      const profile = await scrapeInstagramProfile(input.target as string);
      return JSON.stringify({ source_context: "hors_pro", profile: profile ?? "profil introuvable" });
    }
    case "propose_action": {
      const { data, error } = await db
        .from("actions")
        .insert({
          contact_id: input.contact_id,
          signal_id: input.signal_id,
          channel: input.channel,
          gift_name: input.gift_name,
          gift_url: input.gift_url,
          gift_price_eur: input.gift_price_eur,
          passion_id: input.passion_id,
          message: input.message,
          justification: input.justification,
          cost_estimate_eur: input.cost_estimate_eur ?? input.gift_price_eur,
        })
        .select("id")
        .single();
      if (!error && input.signal_id) {
        await db.from("signals").update({ status: "treated" }).eq("id", input.signal_id);
      }
      return JSON.stringify(error ? { error: error.message } : { action_id: data.id, status: "proposed" });
    }
    default:
      return JSON.stringify({ error: `tool inconnu: ${name}` });
  }
}

export async function runMadeleine(task: string, maxIterations = 20) {
  const client = new Anthropic();
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: task }];
  const trace: Array<{ type: string; detail: string }> = [];

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      // web_search en cours côté serveur : on ré-injecte et on continue
      messages = [...messages, { role: "assistant", content: response.content }];
      trace.push({ type: "pause_turn", detail: "recherche web en cours" });
      continue;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          trace.push({ type: "tool", detail: `${block.name}(${JSON.stringify(block.input).slice(0, 200)})` });
          let out: string;
          try {
            out = await execTool(block.name, block.input as Record<string, unknown>);
          } catch (e) {
            out = JSON.stringify({ error: String(e) });
          }
          results.push({ type: "tool_result", tool_use_id: block.id, content: out });
        }
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    // end_turn (ou refusal)
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return { text, trace, stop_reason: response.stop_reason };
  }
  return { text: "Max iterations atteint", trace, stop_reason: "max_iterations" };
}
