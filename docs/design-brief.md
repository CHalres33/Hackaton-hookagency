# Brief Claude Design — Madeleine

Brief autonome à coller dans Claude Design. Produit : cockpit GTM émotionnel (hackathon, démo 2 min).

---

## Le produit

**Madeleine** est un cockpit de prospection B2B qui transforme les signaux d'achat en gestes qui créent de l'émotion : carte manuscrite, place de concert, billets pour un match. Un agent IA détecte les signaux, scanne les passions publiques du prospect, choisit le geste et rédige le mot. L'humain valide chaque action. La construction de relation est gamifiée : chaque prospect monte en niveau comme dans un jeu.

Utilisateurs : équipes sales/growth. Contexte de démo : ~20 comptes suivis, ~40 prospects.

## Direction artistique

- **Dark mode par défaut**, ambiance cockpit gaming premium mais lisible et pro
- Couleurs : fond noir profond, accent **rose vif** (marque Hook), touches dorées réservées aux éléments « légendaires »
- Typo moderne sans-serif ; les messages rédigés et la carte manuscrite utilisent une **police manuscrite réaliste**
- Micro-animations : nouveau signal qui glisse en haut du fil, jauges qui se remplissent, confettis discrets au level-up
- Desktop-first (démo vidéoprojetée), responsive raisonnable

## Structure : 5 vues + header permanent

### Header permanent (gamification)
Logo Madeleine 🧁, XP équipe avec barre de progression, streak du jour (🔥 x notifications traitées <24h), 3-4 badges débloqués, avatar. À droite : bouton primaire **« + Ajouter un prospect »** et bouton secondaire **« Connecter votre CRM »**.

### 1. Fil d'actualité (home)
Flux vertical temps réel des signaux détectés. Chaque carte signal :
- Icône du type de signal (changement de poste, recrutement en cours, levée de fonds, champion qui bouge)
- **Rareté** façon loot de jeu : Commun (gris), Rare (bleu), Épique (violet), **Légendaire (doré, halo animé)** — dérivée du score 0-100 affiché en pastille
- Prospect + entreprise (avatar, logo), résumé du signal en une phrase, timestamp
- Statut : Nouveau / Agent en cours… / Proposition prête / Traité
- CTA « Traiter » → ouvre la proposition dans la file de validation
Sidebar droite : top comptes de la semaine, dernières actions envoyées.

### 2. File de validation (l'écran clé de la démo)
Liste de propositions de l'agent, une carte détaillée à la fois :
- En-tête : prospect, entreprise, signal déclencheur, **canal choisi** sur l'échelle d'escalade visualisée (email → LinkedIn → carte manuscrite → cadeau passion → cadeau légendaire) avec le barreau sélectionné en surbrillance
- **Le geste** : pour un cadeau, visuel + nom + prix + lien d'achat réel (ex. « 2 places finales Coupe du Monde d'escalade IFSC, Chamonix, demain — 89€ »)
- **Le mot d'accompagnement** rédigé en police manuscrite, éditable inline
- **Justification de l'agent** (encadré) : « Signal fort (92) : nouveau poste de VP Sales. Relation tiède (3 échanges email). Passion escalade certifiée (source : son post LinkedIn, citation). Creep-check : passion pro-publique → nommable. Budget autorisé : 150€. »
- Badge **creep-safety** : vert « pro-public, nommable » / orange « guide le choix, non révélé »
- Actions : **Approuver** (primaire), Rejeter, Éditer. Compteur XP « +40 XP » sur le bouton Approuver.

### 3. Fiche prospect
- Identité : photo, nom, titre, entreprise, localisation, niveau de relation gamifié (**Inconnu → Contact → Connexion → Champion → Ambassadeur**) avec jauge XP
- **Enrichissement** champ par champ avec statut : email ✓ (vérifié), téléphone ✓, adresse bureau ✓, LinkedIn ✓ — pending en pulsation, failed en rouge doux
- **Profil de passions** : cartes passion (icône, valeur ex. « Escalade », barre de confiance 0-100%, citation de preuve, lien source, date, badge creep-safety)
- Bouton **« Scanner le prospect »** → panneau de progression du scan en direct, étapes streamées : « Résolution d'identité… 96% ✓ », « LinkedIn : 2 posts pertinents », « Podcasts : 1 interview trouvée », « Synthèse : 3 passions détectées »
- Timeline relation : événements Gmail/LinkedIn/CRM mêlés, + gains d'XP associés
- Signaux liés à ce prospect

### 4. Aperçu carte manuscrite
Préview plein écran d'une carte physique : recto avec le mot en police manuscrite sur beau papier texturé, verso adresse postale du bureau. Boutons « Télécharger PDF » et « Envoyer via Handwrytten ».

### 5. Modales
- **« + Ajouter un prospect »** : champ unique « Collez une URL LinkedIn », puis états successifs : enrichissement en cours → contact créé dans le CRM → scan passions lancé
- **« Connecter votre CRM »** : tuiles HubSpot / Pipedrive / Salesforce avec logo et bouton Connecter (état « Connecté ✓ » pour l'une d'elles)

## Données de démo à utiliser (réelles, issues de nos scans)

- **Arthur C., CTO d'une startup SaaS parisienne** — passion Escalade (confiance 90%, preuve : « he basically lives in a gym », son post LinkedIn) → cadeau légendaire : places finales Coupe du Monde IFSC Chamonix demain. Signal déclencheur : levée de fonds 1,7M€.
- **Arnaud W., CEO** — passion Littérature classique (95%, podcast « l'éloquence d'un startuper littéraire », comparé à Rastignac) → cadeau : édition Pléiade du Père Goriot. Signal : nouveau poste.
- **Benjamin D., CEO** — passé forces spéciales (95%, ses interviews) → cadeau : saut en parachute tandem + livre Extreme Ownership. Signal : ouverture de 4 postes sales.
Compléter avec ~10 autres prospects fictifs réalistes (noms FR, boîtes SaaS/scale-up) à divers stades.

## Stack attendue

Next.js App Router + Tailwind, composants React propres et découpés, données mockées dans un fichier central (elles seront branchées sur Supabase ensuite — prévoir des shapes de données claires). Pas de dépendance UI lourde.
