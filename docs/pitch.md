# Pitch Madeleine — draft v1 (round 1 : 1:30 pitch + 1:30 démo + 2:00 Q&A)

## Le pitch (1:30)

**[Problème — 25s]**
« Levez la main si vous avez reçu un cold email généré par IA cette semaine. Voilà le problème : l'outbound est devenu du bruit. Nous, on est une agence de prospection — 40 clients, 300 à 600 calls par jour — on VIT ce problème. La seule chose qu'aucun email n'a jamais créée : une émotion. Un geste physique, si. Mais il coûte de 3€ la carte manuscrite à 500€ les places de finale, et personne ne sait décider qui le mérite, quand, et surtout quoi offrir. »

**[Solution — 40s]**
« Madeleine est l'agent qui prend cette décision. Elle croise trois choses : les signaux d'intent de Sillage — levée, changement de poste, champion qui bouge ; l'enrichissement FullEnrich — qui est cette personne, comment la joindre ; et un scan de passions unique — elle lit les posts, les podcasts, les bios de conf, et en sort des passions PROUVÉES, avec citation et source. Ensuite Claude arbitre sur une échelle d'escalade émotionnelle : le physique se mérite. Email pour un inconnu, carte manuscrite pour une relation tiède, et le cadeau parfait au moment parfait pour un champion. Chaque proposition passe par validation humaine, avec le raisonnement complet — y compris son garde-fou anti-creep : ce qui vient de la sphère privée est exclu, ce qui vient d'Instagram guide le choix mais n'est jamais révélé. »

**[Impact business — 25s]**
« Un SDR fait 100 calls pour 1 RDV. Une madeleine bien placée, c'est un taux de réponse d'un autre ordre de grandeur — et surtout des relations qui composent dans le temps : nos champions sont trackés, quand ils changent de boîte, Madeleine rouvre la porte dans le nouveau compte. On ne vend pas du volume, on vend de la mémoire émotionnelle à l'échelle. »

## La démo (1:30) — scénario précis

1. **[15s] Fil d'actualité** — les signaux Sillage en temps réel, avec rareté. « Voilà ce qui est arrivé ce matin. »
2. **[20s] LE moment** — bouton simulate ou signal Arthur déjà traité : « Signal légendaire : le CTO de Sillage vient de lancer sa boîte et de lever 1,7M€. Madeleine a scanné ses passions : escalade, preuve à l'appui — son propre post de lancement. »
3. **[35s] File de validation** — la proposition : 2 places pour la Coupe du Monde d'escalade IFSC à Chamonix **ce week-end** (elle a trouvé l'événement seule, lien d'achat réel), le mot rédigé, et la justification : « elle a refusé d'elle-même le cadeau VIP — première marque physique sur une relation tiède, ce serait du bribe. » → **Approuver** → carte manuscrite part via Handwrytten, +50 XP.
4. **[20s] Le chemin complet** — fiche d'un prospect froid (Charles) : la frise email → LinkedIn → carte → cadeau, chaque étape avec sa condition de passage, plusieurs cadeaux au choix. « Même agent, deux jugements opposés, tous les deux corrects. »
5. **[Bonus si temps] Scan de marché** — « Et pour remplir le pipe : FullEnrich trouve les décideurs sur nos comptes cibles, ils passent sous champion tracking Sillage automatiquement. » (6 vrais CRO/Heads of trouvés cet après-midi en un appel.)

## Mapping critères du jury (100 pts)

- **Impact business (25)** : nous SOMMES l'utilisateur (agence outbound, 40 clients). Chiffres réels du quotidien. Économie du geste : un cadeau à 70€ vs 500 dials.
- **Profondeur IA/workflow Anthropic (25)** : agent Claude tool-use complet (7 outils + web_search serveur avec filtrage par code execution), échelle de décision, anti-creep dans le system prompt, validation humaine, plan relationnel multi-étapes.
- **Profondeur data FullEnrich & Sillage (25)** : Sillage = signaux live + persona + 4 agents de détection + champion tracking (watchlist). FullEnrich = enrichissement contact ET Search People pour le scan de marché. Les deux sont dans le cœur du flux, pas en décor.
- **Présentation (25)** : le mot pour Arthur lu à voix haute. Le contraste Arthur/Charles. La frise qui monte.

## Q&A — réponses préparées

- **« Et le RGPD / vie privée ? »** → Garde-fou gradué hard-codé : sphère privée exclue, hors-pro jamais révélé, uniquement des sources publiques, validation humaine systématique, raisonnement creep-safety affiché.
- **« Ça scale ? »** → Le scan coûte ~1-2€ d'API par prospect, un SDR coûte 25€/h. On scanne uniquement sur signal fort (le seuil est le levier).
- **« Pourquoi pas juste un cadeau via une marketplace corporate ? »** → Les marketplaces envoient des goodies génériques. La valeur est dans la DÉCISION (qui/quand/quoi) et la preuve de passion. Le cadeau sans le bon timing, c'est du budget gaspillé.
- **« Différence avec Alyce/Reachdesk ? »** → Eux = catalogue + workflow manuel. Nous = décision autonome signal-driven + passion prouvée + escalade relationnelle. Et CRM-agnostic.

## Description de soumission (à coller)

Madeleine est l'agent GTM qui rend la prospection humaine. Elle écoute les signaux d'intent (Sillage), enrichit les contacts (FullEnrich), scanne les passions publiques d'un prospect avec preuves à l'appui (Claude + web search + réseaux sociaux), puis décide sur une échelle d'escalade émotionnelle : email, LinkedIn, carte manuscrite ou le cadeau parfait au moment parfait — jamais creepy, toujours validé par un humain, avec le raisonnement complet affiché. Les champions sont trackés : quand ils bougent, la relation rouvre une porte dans un nouveau compte. Construit par Hook Agency, agence outbound (40 clients) — nous sommes notre propre premier client.
