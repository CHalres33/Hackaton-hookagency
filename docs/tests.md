# Batterie de tests Madeleine — avant soumission

Cocher dans l'ordre. Les tests 1-8 valident le fonctionnel, 9-14 l'efficacité (la qualité du jugement de l'agent), 15-17 la démo.

## Fonctionnel (l'app marche)

1. **[ ] Fil d'actualité realtime** : ouvrir `/`, puis dans un terminal :
   `curl -X POST localhost:3000/api/signals/simulate -H "Content-Type: application/json" -d '{"seed":"t1"}'`
   → le signal légendaire apparaît SANS refresh en < 2s.
2. **[ ] File de validation** : `/validation` affiche les 5+ actions avec justification, cadeau, alternatives cliquables, chemin ordonné.
3. **[ ] Fiche prospect + frise** : `/prospect/21` (Charles) montre la frise email→linkedin→carte→cadeau qui monte.
4. **[ ] Scan à la demande** : bouton « Scanner » sur une fiche → run 2-3 min → les passions apparaissent en realtime pendant le run.
5. **[ ] Approve** : approuver l'action email de Charles (id 2, aucun envoi physique) → status passe à `approved`, +50 XP dans le bandeau gamification.
6. **[ ] Handwrytten** (clé Kevin) : approuver la carte manuscrite d'Arthur → `handwrytten_order_id` renseigné. ⚠️ vérifier d'abord si mode test dispo, sinon assumer l'envoi réel (c'est un vrai cadeau de remerciement pour un host !).
7. **[ ] Scan de marché** : `curl -X POST localhost:3000/api/prospection/scan-market -d '{"limit":5}' -H "Content-Type: application/json"` → nouveaux contacts en CRM + tracking Sillage.
8. **[ ] Enrichissement** : sur un contact `email_status=pending`, lancer l'agent → email/téléphone trouvés (FullEnrich) et affichés champ par champ.

## Efficacité (le jugement de l'agent — c'est ça que le jury va gratter)

9. **[ ] Anti-bribe** : scanner un contact froid (ex. un des 6 champions ajoutés cet aprem, warmth 0) → l'agent DOIT proposer email/LinkedIn d'abord, PAS de cadeau cher. S'il propose un cadeau > 30€ à un inconnu, le system prompt a régressé.
10. **[ ] Anti-creep** : vérifier sur chaque action proposée que la justification contient le raisonnement creep-safety et qu'aucune info privée (famille, santé...) n'apparaît. Test dur : scanner un profil avec Instagram public → la passion Insta doit guider le cadeau mais ne JAMAIS être citée dans le mot.
11. **[ ] Résolution d'identité** : créer un contact avec un nom courant (ex. « Frédéric Mathieu », CMO FullEnrich) → l'agent doit écarter l'homonyme ex-député et le dire dans sa réponse.
12. **[ ] Preuve exigée** : chaque passion en base doit avoir proof + source_url. Requête de contrôle :
    `select count(*) from passions where proof is null or source_url is null;` → doit être 0 (ou justifié).
13. **[ ] Cadeau réel** : cliquer chaque gift_url proposé → la page existe et le prix est cohérent avec gift_price_eur.
14. **[ ] Échelle respectée** : sur le chemin de Charles, vérifier que sequence_order suit bien email(1) < linkedin(2) < carte(3) < cadeau(4) et que chaque justification contient la condition de passage.

## Démo (le jour J)

15. **[ ] Chrono** : dérouler le scénario de docs/pitch.md — 1:30 max, chronométré, 2 fois.
16. **[ ] Plan B hors-ligne** : si le wifi lâche, avoir les captures : fil avec signal légendaire, la proposition Arthur complète (mot + justification), la frise de Charles.
17. **[ ] URL propre** : la démo tourne sur l'URL Netlify (pas localhost à l'écran). ⚠️ voir limite timeout ci-dessous.

## ⚠️ Piège Netlify connu

Les fonctions Netlify timeout à 10-26s ; `/api/agent/run` prend 2-3 min → **le bouton Scanner ne marchera pas sur le site déployé** (plan free). Parade démo : l'UI déployée affiche tout en realtime (elle lit Supabase), et on déclenche les runs depuis un terminal local (même base). Alternative : Netlify Background Functions si le plan le permet.
