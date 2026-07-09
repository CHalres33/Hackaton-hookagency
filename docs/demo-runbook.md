# Runbook démo — 2 minutes chrono

URL : https://madeleine-hook.netlify.app (fallback : `npm run dev` local)
Avant de monter sur scène : vérifier que `ANTHROPIC_API_KEY` + `SILLAGE_API_KEY` sont dans les env Netlify, ouvrir l'app dans un onglet propre, zoom navigateur 110-125%.

## Le pitch en une phrase (0:00-0:15)

« L'outbound est devenu du bruit. Madeleine transforme les signaux d'achat en gestes qui créent une émotion réelle : le bon cadeau, à la bonne personne, au bon moment. Une madeleine à la fois. »

## Déroulé (0:15-1:45)

1. **[Fil d'actualité]** « Sillage tracke 20 comptes. Chaque signal arrive scoré, avec sa rareté. » → montrer le signal **légendaire doré** d'Arthur (CTO Sillage, dans la salle).
2. **Injecter le signal live** (voir SQL plus bas, depuis un 2e onglet Supabase ou un bouton caché) → le signal glisse en haut du fil en temps réel. « Il vient d'arriver. »
3. **Cliquer « Traiter »** → « L'agent résout l'identité, scanne la présence publique, applique notre garde-fou anti-creep, et choisit sur l'échelle d'escalade : le physique se mérite. »
4. **[Fiche prospect d'Arthur]** pendant que l'agent tourne → passions avec **preuves sourcées** (« il écrit lui-même : *he basically lives in a gym* »), jauge de relation, frise.
5. **[File de validation]** → la proposition : **2 places pour les finales de la Coupe du Monde d'escalade IFSC à Chamonix, qui commencent DEMAIN**, 70€, avec le mot manuscrit rendu sur papier + la justification de l'agent (signal 90, relation tiède, passion prouvée pro-publique → nommable, budget OK).
6. **Approuver** → +100 XP, streak, badge « Première madeleine ». « L'humain valide toujours. Une carte manuscrite partirait vraiment via Handwrytten. »

## Le closing (1:45-2:00)

« Tout est réel : les signaux Sillage, l'enrichissement FullEnrich, le raisonnement Claude, les preuves sourcées. Et le garde-fou anti-creep est dans le system prompt : ce qui vient de la sphère privée n'existe pas pour Madeleine. Le cadeau crée l'émotion ; Madeleine décide qui le mérite. »

## SQL : injecter le signal légendaire en live

```sql
insert into signals (type, source, payload, score, confidence, account_id, contact_id, status)
values ('fundraise', 'sillage',
  '{"summary":"Sillage annonce son pré-seed de 1,7M€ — post LinkedIn d''Arthur il y a 4 min","sillage_id":"demo-live-1"}',
  92, 0.97, (select id from accounts where domain='getsillage.com'), 2, 'new');
```

(Contact 2 = Arthur Coudouy. Garder ce SQL prêt dans l'éditeur Supabase, onglet à côté.)

## Plans B

- Agent lent/en panne → l'action Chamonix existe déjà en base (créée à l'avance) : filtrer la file de validation dessus et dérouler à partir de l'étape 5.
- Réseau KO → démo en local, mêmes données.
- Question jury « et la vie privée ? » → montrer le badge creep-safety + le paragraphe anti-creep du system prompt (lib/agent/madeleine.ts).
