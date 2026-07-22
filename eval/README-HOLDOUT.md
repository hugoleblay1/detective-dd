# Pack HOLDOUT — jeu de validation jamais vu

## À quoi il sert
Mesurer la **généralisation** des règles du moteur : mêmes seuils et mêmes exigences que le corpus A-E, mais formulations, structures documentaires et angles délibérément différents (questionnaire E&S en Q/R, lettre SBTi en anglais, annexe de term sheet, « quintiles de richesse », condition +3 absente par silence…). 10 cas.

## Installation
1. Copier les dossiers `deal-F…` et `deal-G…` dans `eval/corpus-holdout/` (les `.md`).
2. Copier `ground-truth-holdout.json` dans `eval/`.
3. Demander à Claude Code (modification d'une ligne, sans toucher au reste) :
   « Dans eval/run-eval.ts, rends le chemin de la vérité terrain configurable :
   const GT_FILE = process.env.GT_FILE ?? path.join("eval","ground-truth.json") »
4. Lancer :
```bash
GT_FILE=eval/ground-truth-holdout.json CORPUS_DIR=eval/corpus-holdout pnpm eval
```

## RÈGLES DE DISCIPLINE — c'est tout l'intérêt du pack
- Le holdout est un **thermomètre, pas un jeu d'entraînement** : ne JAMAIS donner son rapport
  d'échecs à Claude Code pour « corriger les cas », et ne jamais écrire de règle
  qui référence ses formulations.
- **Lecture du résultat** (score corpus ≈ 24/27 ≈ 89 %) :
  - holdout ≥ 8/10 → les règles généralisent, continuer ;
  - holdout ≤ 6/10 → sur-apprentissage confirmé : passe de dé-généralisation des règles
    (supprimer/regénéraliser celles qui paraphrasent le corpus A-E), puis re-mesurer ;
  - entre les deux → regarder QUELS cas échouent : les `hint` disent ce que chaque cas
    éprouve (ils servent au diagnostic humain, pas à réécrire le prompt).
- Si un jour le holdout sert à corriger (ça arrive, en dernier recours documenté),
  il devient du corpus : générer un NOUVEAU holdout avant de continuer.

## Vérité terrain — points de conception
- F teste le **+1 Atténuation** (jamais couvert par A-E) et la frontière plan certifié ≠ co-bénéfices.
- G teste la condition ET manquante **par silence** (D ne testait que la négation explicite),
  la conformité générique (« normes en vigueur ») comme non-preuve, et le seuil **franchi**
  des chaînes de valeur (52 % ≥ 50 %), miroir du cas E (30 %).
- Les documents mêlent français et anglais (lettre SBTi) — réalité des dossiers.
