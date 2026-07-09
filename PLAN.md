# Madeleine — GTM émotionnel par le physique

Hackathon Agentic GTM (Anthropic × FullEnrich × Sillage), Station F, 9 juillet 2026. Deadline submission 17h30, démo 2 min.
Jugement : impact business / profondeur workflow IA / profondeur data / présentation (25 pts chacun).

## Le pitch

Le geste physique crée une émotion qu'aucun email ne crée, mais il coûte de 3€ (carte manuscrite) à 500€ (places World Cup). **Madeleine est l'agent qui décide qui le mérite, quand, et surtout quoi** : signaux d'intent (Sillage) × enrichissement (FullEnrich) × chaleur de relation (Gmail + LinkedIn réels) × scan des passions du prospect (recherche web/réseaux sociaux) → Claude arbitre sur une échelle d'escalade émotionnelle, choisit le cadeau qui touche vraiment (il aime le rock → place de concert rock dans sa ville ; sa nationalité joue la World Cup → places du match) et rédige le mot qui l'accompagne → validation humaine → envoi. La relation se construit comme un jeu : on fait monter chaque prospect de niveau.

## Décisions actées

- CRM simulé dans **Supabase** (tables + realtime), positionné « CRM-agnostic »
- Geste physique : **rendu manuscrit à l'écran + envoi réel Handwrytten API** (clé chez Kevin)
- Stack : **Next.js + Supabase, déployé Netlify**
- Clé Anthropic : Kevin claim ses $100 (compte Console email perso)
- Dashboard : spec passée à **Claude Design** puis import via Netlify
- **Gamification** de la création de relation
- Démo : cadeaux **virtuels dans l'app** (lien d'achat), pas de remise physique
- Profils vitrines seedés : **Arnaud Weiss, Arthur Coudouy, Benjamin Douablin** (scans pré-validés, voir `docs/scan-hosts.md`)

## Architecture

```
Sillage (signaux) ─┐
FullEnrich (API) ──┤→ Agent Madeleine (Claude API, tool use) → File de validation → Handwrytten API
Gmail+HeyReach ────┘         ↓                                        ↓
                   Supabase (CRM simulé + realtime) ←────── Dashboard Next.js (Netlify)
```

- **App** : Next.js (App Router) dans ce repo. API routes = backend de l'agent.
- **Supabase** : DB + Realtime pour le fil d'actualité.
- **Agent** : route `/api/agent/run`, Claude (claude-sonnet-5, tool use) avec outils : `get_signals`, `enrich_contact` (FullEnrich REST), `get_relationship`, `web_search` (natif API Claude), `scrape_social` (Apify/Vayne), `propose_action`.
- **Sillage** : MCP côté Charles. Mode (a) API/webhook → table `signals` si possible, (b) fallback : export des signaux des 20 comptes trackés seedés + bouton « simulate incoming signal » pour la démo.
- **Gmail → relation** : sync des historiques d'échanges par contact (nb threads, récence, qui initie, temps de réponse) → `relationship_events`. Pas d'OAuth dans l'app : sync via Claude Code/MCP.
- **HeyReach → relation LinkedIn** : l'API HeyReach expose l'inbox des conversations LinkedIn → `relationship_events` (source linkedin, direction, date, dernier expéditeur). Chaleur = email + LinkedIn + CRM pondérés ; une conversation LinkedIn active récente pèse fort.

## Modèle de données (Supabase)

- `accounts` — les ~20 comptes trackés Sillage (nom, domaine, logo, tier)
- `contacts` — identité, titre, linkedin_url, email / téléphone / adresse postale (bureau) + statut d'enrichissement par champ (pending/found/failed + confidence), account_id
- `signals` — fil d'actualité : type (job_change, hiring_intent, champion_move, fundraise…), source, payload, score (0-100) + confidence, contact_id/account_id, created_at, status
- `passions` — catégorie, valeur, preuve (citation), source_url, date_source, confidence, giftability, creep_safety, découvert_le
- `relationship_events` — interactions Gmail/LinkedIn/CRM (source, direction, date, poids)
- `relationships` — score de chaleur agrégé (0-100) + niveau de jeu + historique de progression
- `actions` — propositions de l'agent : canal (email / linkedin / carte manuscrite / cadeau personnalisé), pour un cadeau : quoi + lien d'achat réel + passion source, message rédigé, justification, coût estimé, status (proposed/approved/rejected/sent), handwrytten_order_id
- `game_state` — XP équipe, streaks, badges

## Le moteur de scan passions (cœur du produit)

**Déclenchement** : auto quand un signal Sillage dépasse un seuil + bouton « Scanner le prospect » sur la fiche.

**Étape 0 — Résolution d'identité** : croiser nom + boîte + ville + photo entre sources. Si confiance < ~90%, le scan s'arrête et le dit. Jamais de cadeau basé sur un homonyme. (Preuve vécue : nos scans de test ont écarté un Frédéric Mathieu ex-député et un Arnaud Weiss journaliste.)

**Étape 1 — Fan-out multi-sources** :
| Source | Outil | Fiabilité |
|---|---|---|
| LinkedIn profil + posts + bénévolat | Vayne et/ou actor Apify LinkedIn | haute, contexte pro |
| Instagram / X / TikTok publics | Apify actors | moyenne, hors contexte pro |
| Interviews, podcasts, bios de conférences | web_search natif API Claude | haute |
| Résultats sportifs publics, Strava, GitHub | web_search ciblé | haute, très giftable |
| Data FullEnrich (université, langues, parcours) | déjà en base | haute |

**Étape 2 — Extraction structurée** : chaque passion = une fiche avec preuve, pas un tag :
`{catégorie, valeur, preuve (citation exacte), source_url, date_source, confidence, giftability, creep_safety}`
- confidence = explicite vs inféré × fiabilité source × récence × corroboration (3 mentions sur 2 ans > 1 like de 2019)
- giftability = peut-on acheter un truc concret ? (concert = 0.9, « aime la nature » = 0.2)

**Étape 3 — Garde-fou anti-creep, gradué selon la source** :
- passion pro-publique (post LinkedIn, interview) → peut être **nommée** dans le mot
- trouvée hors contexte pro (X, Insta) → guide le **choix** du cadeau, jamais révélée
- sphère privée (famille, santé, religion, politique) → **exclue**, hard-codé dans le prompt système
- l'agent affiche son raisonnement creep-safety dans la file de validation

**Étape 4 — Matching cadeau** : pour chaque passion giftable, web_search d'un cadeau réel et achetable (le vrai concert à venir dans la ville du prospect, le vrai match de sa sélection) avec lien, prix, matché au budget autorisé par score signal × relation.

## L'agent : échelle d'escalade émotionnelle

1. **Score du signal** : type × récence × fit ICP
2. **Chaleur de relation** : froid → tiède → chaud
3. **Matrice** : signal fort × relation chaude × tier 1 = geste physique ; signal moyen × relation froide = email d'abord. Le physique se mérite. Échelle : email < LinkedIn < carte manuscrite < cadeau passion < cadeau légendaire (World Cup selon nationalité).
4. **Choix du cadeau** : passions × budget autorisé par le score, cadeau concret et achetable avec lien.
5. **Rédaction** : ton personnel, registre émotionnel adapté au signal, relie signal et passion sans être creepy. Pas de marqueurs IA, pas de tirets longs.
6. **Justification affichée** dans la file de validation (signal, chaleur, passion source, coût) — c'est ce que le juge lit.

## Gamification de la relation

- **Niveaux par contact** : Inconnu → Contact → Connexion → Champion → Ambassadeur, jauge XP par contact
- **XP équipe + streak** : chaque action validée rapporte de l'XP ; combo si signal traité < 24h
- **Badges** : « Première madeleine envoyée », « Champion réactivé », « 5 signaux traités dans la journée »
- **Fil gamifié** : signaux avec rareté (commun/rare/légendaire selon le score)
- Implémentation légère : dérivé des tables + `game_state`, calculé côté front

## Dashboard (via Claude Design)

1. **Fil d'actualité** (home) — signaux realtime, carte par signal avec score, rareté, compte, CTA « traiter »
2. **File de validation** — message rendu, justification, coût, Approuver/Rejeter/Éditer
3. **Fiche prospect** — enrichissement champ par champ, profil de passions avec sources (+ bouton « scanner » live), jauge relation + niveau, timeline, signaux liés
4. **Rendu carte manuscrite** — préview réaliste + envoi Handwrytten
5. **Bandeau gamification** — XP, streak, badges, top comptes
6. **Ajout manuel de prospect** — bouton « + Ajouter un prospect » : coller une URL LinkedIn → l'agent enrichit (Vayne/FullEnrich), crée le contact dans le CRM et lance le scan passions. C'est l'entrée « à la demande » en plus des signaux Sillage.
7. **Connexion CRM** — bouton « Connecter votre CRM » : modal avec connecteurs HubSpot / Pipedrive / Salesforce (UI de connexion réaliste ; pour la démo le connecteur écrit dans nos tables Supabase). Vend le positionnement CRM-agnostic.

Identité visuelle : noir/rose Hook.

## Ordre de build (deadline 17h30)

1. **[30 min] Fondations** — scaffold Next.js, projet Supabase, schéma + seed (20 comptes, ~40 contacts dont les 3 profils vitrines)
2. **[1h30] Tranche verticale** — 1 signal seedé → agent Claude (FullEnrich réel + web_search scan passions) → proposition cadeau + mot en base → page validation minimale → approve → Handwrytten. Moment wow : le scan qui trouve la passion et propose un vrai cadeau.
3. **[1h en parallèle] Spec design → Claude Design** — puis import Netlify et branchement Supabase
4. **[1h] Data réelle** — sync Gmail + HeyReach → relationship_events, intégration Sillage, scoring signaux
5. **[1h] Gamification + polish** — niveaux, XP, badges, rendu manuscrit
6. **[45 min] Déploiement Netlify + scénario démo** — un signal « légendaire » arrive en live, l'agent propose, on approuve
7. **[30 min] Pitch** — « l'outbound est devenu du bruit ; Madeleine rend la prospection humaine, une madeleine à la fois »

## Répartition des tâches

### Charles — Sillage, data, pitch
1. **Sillage** : finaliser le MCP, choisir les 20 comptes trackés (inclure Sillage/FullEnrich elles-mêmes si possible pour la démo miroir), vérifier si une API/webhook permet de pousser les signaux vers Supabase ; sinon exporter les signaux en JSON au format de la table `signals`
2. **Apify** : créer le compte (free tier), tester les actors LinkedIn posts / X / Instagram sur les 3 profils vitrines, noter la clé dans le `.env` partagé
3. **Handwrytten** : vérifier la clé, repérer l'endpoint d'envoi (singleStepOrder), voir s'il existe un mode test
4. **Seed réaliste** : compléter la liste des ~40 contacts de démo (vrais noms des 20 comptes trackés Sillage, cohérents avec les signaux)
5. **Pitch** : story 2 min + description de submission + répétition chrono (s'appuyer sur `docs/scan-hosts.md` pour le moment wow)

### Kevin + Claude Code — app, agent, design
1. Claim la clé Anthropic ($100) + rassembler toutes les clés dans `.env` (FullEnrich, Vayne, HeyReach, Handwrytten, Apify)
2. Scaffold Next.js + projet Supabase (schéma + seed initial, dont les 3 profils vitrines de `docs/scan-hosts.md`)
3. Agent Madeleine : route `/api/agent/run`, tool use (FullEnrich, web_search, scrape_social, propose_action), échelle d'escalade + anti-creep dans le system prompt
4. Spec dashboard → Claude Design → import Netlify → branchement Supabase
5. Sync Gmail + HeyReach → `relationship_events` + score de chaleur
6. Gamification, rendu carte manuscrite, déploiement Netlify, scénario de démo

### Point de synchro
- Dès que la tranche verticale passe (étape 2 du build), démo interne à deux → on décide ce qu'on coupe
- Tout passe par `main`, pushs fréquents, pas de PR (convention du README)

## Clés / accès nécessaires

- [ ] Clé Anthropic (Kevin claim ses $100) → `.env`
- [ ] Clé Handwrytten (Kevin)
- [ ] Config MCP / API Sillage (Charles) + liste des 20 comptes trackés
- [ ] Clé FullEnrich (Kevin, existante)
- [ ] Clé Apify (compte à créer, free tier OK) + actors Instagram/X/LinkedIn
- [ ] Clés Vayne + HeyReach (Kevin, existantes)

## Vérification

- Tranche verticale : signal seedé → `action` créée avec message + justification → approve UI → appel Handwrytten (mode test si dispo)
- Enrichissement : enrich FullEnrich réel sur 2-3 contacts, email/tél dans la fiche
- Realtime : insert SQL d'un signal → apparition dans le fil sans refresh
- Démo chronométrée < 2 min sur l'URL Netlify
