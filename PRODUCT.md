# Détective DD — Vision produit

## En une phrase

Donner à tout investisseur à impact une grille de lecture « très carrée » par type d'investissement pour évaluer le potentiel d'impact d'un projet et sa qualification à une stratégie d'impact — et un copilote IA qui confronte le dossier (contexte local + documents client + ressources expertes) aux exigences de cette grille.

## Utilisateurs cibles

1. **Proparco (design partner).** Portefeuille multisectoriel rare — le cas d'entraînement idéal : des grilles à construire sur un éventail très large de secteurs, avec des experts mobilisés sur chacun. La méthodologie et les grilles produites ici appartiennent à leur périmètre (voir note PI).
2. **DFIs et fonds à impact** (type DFC, BII, FMO ; responsAbility, Triple Jump…). Besoin d'une méthodologie outillée pour qualifier l'impact de leurs deals, au quotidien. Cœur du marché : usage fréquent, équipes d'investissement structurées.
3. **Entreprises en recherche de financement** (plus tard). Comprendre les critères des DFIs pour auto-évaluer leur dossier avant de le présenter. Usage ponctuel, produit dérivé en lecture seule — pas la priorité, mais l'architecture ne doit pas l'exclure.

## Principes produit (non négociables)

- **L'Excel du client reste la source de vérité, modulable par lui.** Le lien Excel → script de publication → application est un contrat produit, pas un détail technique. Chaque client révise sa grille dans son Excel ; l'appli la reflète.
- **Moteur générique / contenu client.** Tout ce qui est méthodologique (grilles, questions, seuils) vit dans `content/<client>/` ; le moteur n'embarque aucune méthodologie en dur.
- **L'agent ne note jamais.** Il évalue la couverture des exigences, cite ses sources, et guide le chargé d'affaires. La note reste une décision humaine.
- **Auditabilité.** Toute affirmation de l'analyse est sourcée (citation exacte + document, ou donnée + source + date).
- **Coût maîtrisé et scalable.** Pas de dépendance systématique aux modèles frontière les plus chers : routage par niveau de tâche (voir Architecture IA).

## Le produit : deux pages

### Page 1 — Parcourir les critères
Rendu ergonomique de la grille : dimensions, prérequis, critères (logique OR, non-applicabilité par sous-type respectée), niveaux, questions de due diligence filtrables. Déjà spécifiée par le prototype validé avec l'équipe IMP.

### Page 2 — Décrire mon dossier (le cœur IA)
Le chargé d'affaires déclare son dossier (type, géographie, notes visées par dimension/critère) et l'outil mobilise trois gisements d'information :

1. **Contexte externe, résumé à l'écran.** Par dimension × géographie, quelques indicateurs de base directement affichés (ex. biodiversité au Kenya : aires protégées majeures, indicateurs clés) — pré-extraits côté serveur depuis les sources de référence, pas de simples liens.
2. **Ancrage local.** Pour les dimensions à analyse locale — Adaptation (résilience du système du projet), Biodiversité (reconstruire la biodiversité sur place), Social/Territoires (≥50 % de l'activité dans un territoire défavorisé) — le CHAFF précise la localisation (région, voire coordonnées GPS : « un projet adaptation dans telle forêt au Brésil »). L'outil fait remonter la donnée la plus granulaire disponible. L'Atténuation, elle, reste une analyse nationale/sectorielle.
3. **Banque de ressources internes, curée par les experts.** La donnée externe ne suffit pas : certaines dimensions exigent des ressources sélectionnées par l'équipe impact. File de qualification (détection → métadonnées saisies par un expert → disponible pour l'analyse). Connecteur par déploiement (serveur Proparco, SharePoint, dossier local en dev).

Plus les **documents du dossier** fournis par le CHAFF (stratégie client, rapports ESG…).

Un agent confronte cette masse d'information aux exigences des critères et questions, et restitue :
- le **tableau comparatif** (statut par question : disponible / manquant, avec citations) — acquis du prototype ;
- un **avis qualitatif consolidé** par dimension : forces du dossier, faiblesses, ce qu'il faut obtenir du client, appréciation de la maturité du dossier au regard de la note visée — toujours sans proposer de note. C'est le cran au-dessus du tableau : guider le CHAFF sur la *qualité* de son dossier impact.

## Architecture IA

- **RAG sur la banque interne et les corpus de contexte** (pgvector sur le Postgres existant — pas de brique supplémentaire).
- **Lecture directe en contexte pour les documents du dossier** (2-3 rapports) — plus fiable que le RAG à cette échelle.
- **Routage de modèles par tâche** : extraction/indexation/routage → modèle léger et peu cher ; analyse d'écart et avis qualitatif → modèle de niveau supérieur. Fournisseur abstrait par la couche `src/lib/llm/` (Anthropic par défaut, endpoint interne client en option).
- **Petites tâches structurées** : un appel par dimension, contrats JSON validés, citations obligatoires.

## Modèle de déploiement et données

Une instance par client (Docker), ses données chez lui. Point de gouvernance : les documents internes d'un client (dont Proparco) ne transitent jamais par une infrastructure personnelle ou mutualisée — en dev, corpus factice ; en démo, VM dédiée avec contenu non sensible ; en production, l'infrastructure du client.

## Note PI

Le moteur et l'architecture sont génériques ; les grilles et la méthodologie de chaque client lui appartiennent. La séparation `content/` vs moteur matérialise cette frontière. Statut contractuel avec Proparco à clarifier avant toute commercialisation.
