# Intégration Sillage — état & endpoints

Workspace hackathon configuré le 09/07 ~12h00 par Charles. Clé API dans `.env` (`SILLAGE_API_KEY`, format `sk_live_...`).

## État

- ✅ 20 top accounts ingérés et résolus (tal_id 118) : getsillage.com, fullenrich.com, anthropic.com, gamma.app, stationf.co, mistral.ai, pennylane.com, qonto.com, alan.com, pigment.com, swan.io, dust.tt, payfit.com, spendesk.com, aircall.io, front.com, doctolib.fr, backmarket.fr, ledger.com, edenred.com
- ✅ Persona (id 439) : décideurs revenue/growth France
- ✅ 4 agents de détection :
  - 2463 `job_update` — Job moves & promotions
  - 2464 `keyword_detection` — Moments de fierté LinkedIn ("levée de fonds", "Series A/B", "product launch", "we are hiring", "award", "keynote"…)
  - 2465 `job_posting_keyword_detection` — Hiring intent sales (SDR, BizDev, AE, Sales)
  - 2466 `customer` — watchlist company id 88 (vide pour l'instant)
- ⏳ Signal runs asynchrones — `GET /v2/workspace/signal-runs` encore vide, poller
- ❌ `POST /v2/contents/query` → 403 « contents not enabled » : feature à activer par l'équipe Sillage (pas bloquant, les signaux passent par workspace/signals)

## Endpoints utiles (base `https://api.getsillage.com/api`, header `Authorization: Bearer $SILLAGE_API_KEY`)

```bash
# Les signaux (source du tool get_signals de Madeleine)
curl -X POST .../v2/workspace/signals/query -H "Content-Type: application/json" \
  -d '{"limit": 25}'   # filtres optionnels: type[], signal_start_date, agent_id, cursor

# Compter
GET /v2/workspace/signals/count

# Un signal
GET /v2/workspace/signals/{id}

# Runs en cours
GET /v2/workspace/signal-runs

# Top accounts
GET  /v2/top-account-list/accounts
POST /v2/top-account-list/accounts          # {"accounts":[{"domain":"acme.com"}]}
POST /v2/top-account-list/accounts/remove

# Setup / debug
GET /v2/setup-state
GET /v2/agents
```

Types de signaux (enum `type` de la query) : `keywordDetection`, `newJob`, `recentlyPromoted`, `jobPostingKeywordDetection`, `competitorInboundComment`, `competitorOutboundComment`, `partnerInboundComment`, `partnerOutboundComment`, … (spec complète : `https://api.getsillage.com/api/v1/docs/spec`)

## Mapping vers la table `signals` (Supabase)

| Sillage | table `signals` |
|---|---|
| `type` (newJob, recentlyPromoted, keywordDetection…) | `type` (job_change, promotion, keyword…) |
| détection `id` | `payload.sillage_id` (dédup) |
| company du détection | `account_id` (join sur domaine) |
| personne du détection | `contact_id` (créer le contact si absent) |
| — | `score` : calculé par Madeleine (type × récence × fit ICP) |

## MCP

Serveur MCP enregistré côté Claude Code (scope user) : `https://api.getsillage.com/api/mcp/v2` (OAuth — `/mcp` pour se logger). L'app, elle, utilise l'API REST ci-dessus.
