# TOKENS — thème Détective DD

Source : maquette Claude design (`design/Detective DD.dc.html`, styles inline consolidés à la main).
Fichier de thème : **`src/app/theme.css`** (variables CSS, importé en tête de `globals.css`).
Contrôle visuel : **http://localhost:3000/style-guide** (la page ne consomme que des `var(--…)`).

État : les composants existants n'utilisent **pas encore** ces tokens — cette tranche livre uniquement le thème et la page de contrôle. Le branchement se fera lors de la refonte des écrans (table de correspondance en bas).

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--color-primary` | `#000191` | Bleu Proparco : header, boutons, liens, accents |
| `--color-primary-hover` | `#1A1AAE` | Survol des boutons primaires |
| `--color-link-hover` | `#3535B8` | Survol des liens |
| `--color-accent` | `#FDC533` | Or : brandline, onglet actif — **ne code plus la note +2** (itération 2 de la maquette) |
| `--color-accent-ink` | `#3A2E00` | Texte posé sur fond or |
| `--color-accent-border` | `#C9A227` | Bordure des éléments or |
| `--color-alert` | `#E2231A` | Erreurs, alertes |
| `--color-bg` | `#F2F3F8` | Fond de page |
| `--color-surface` | `#FFFFFF` | Cartes, panneaux |
| `--color-ink` | `#17173A` | Texte principal (navy) |
| `--color-ink-soft` | `#41415E` | Texte secondaire |
| `--color-muted` | `#6A6A85` | Texte atténué, labels |
| `--color-faint` | `#8A8AA5` | Texte très atténué |
| `--color-line` | `#E2E3EE` | Bordures |
| `--color-line-soft` | `#EEEFF6` | Bordures/soulignés discrets |
| `--color-primary-tint` | `#EBEBF9` | Fonds bleutés (survols, sélections) |
| `--color-primary-faint` | `#F5F5FD` | Fonds bleutés très pâles |
| `--color-control-border` | `#C9CADD` | Bordures des contrôles (segments, chips, champs) |
| `--color-surface-tint` | `#FAFAFE` | Fonds de lignes légèrement bleutés, survols de cartes |
| `--color-on-primary-strong` / `-on-primary` / `-on-primary-muted` | `#DCDCF6` / `#CFCFF2` / `#B9B9E8` | Textes posés sur fond bleu (header, bandeau de synthèse) |

## Statuts d'exigence (couvert / partiel / manquant)

Utilisés partout : badges de verdict, lignes du tableau de couverture, sommaire, maturité.

| Statut | Texte | Fond pâle | Bordure |
|---|---|---|---|
| Couvert | `--status-ok` `#1E7A3C` | `--status-ok-tint` `#E9F5EC` | `--status-ok-border` `#BFE3CA` |
| Partiel | `--status-mid` `#8A6100` | `--status-mid-tint` `#FBF3DC` | `--status-mid-border` `#F3E3AC` |
| Manquant | `--status-ko` `#E2231A` | `--status-ko-tint` `#FCEBEA` | `--status-ko-border` `#F5C6C2` |

## Échelle de notation −2 … +3

4 variables par niveau : `-txt` (texte au repos), `-tint` (fond au repos), `-sel-bg` / `-sel-txt` (segment sélectionné). Préfixes `m` = moins, `p` = plus.

Itération 2 de la maquette : négatif en rouges, **0 neutre** (blanc à bordure), **positif en dégradé de vert** (+1 clair → +3 foncé). L'or ne code plus le +2.

| Niveau | Libellé | txt | tint | sel-bg | sel-txt |
|---|---|---|---|---|---|
| `--score-m2-*` | Désaligné | `#7F100B` | `#F9DEDC` | `#A3170F` | `#FFFFFF` |
| `--score-m1-*` | Enjeu mal géré | `#E2231A` | `#FCEBEA` | `#E2231A` | `#FFFFFF` |
| `--score-0-*` | Pas d'enjeu | `#5A5A72` | `#FFFFFF` | `#FFFFFF` | `#17173A` |
| `--score-p1-*` | Pris en compte | `#2E7D46` | `#EDF7F0` | `#6FBE85` | `#FFFFFF` |
| `--score-p2-*` | Qualifie l'objectif stratégique | `#1E7A3C` | `#D9EFE0` | `#2E9E52` | `#FFFFFF` |
| `--score-p3-*` | Excellence | `#0F4D24` | `#C3E5CE` | `#136A31` | `#FFFFFF` |

Compléments du niveau 0 neutre : `--score-0-border` `#D5D6E6` (bordure au repos), `--score-0-border-sel` `#17173A` (sélectionné/survol), `--score-0-badge-bg` `#F4F4F8` (fond de badge).

## Piliers

| Token | Valeur | Usage |
|---|---|---|
| `--pillar-planete-bg` / `--pillar-planete-ink` | `#E9F5EC` / `#1E7A3C` | Pastille pilier Planète |
| `--pillar-inclusion-bg` / `--pillar-inclusion-ink` | `#FFF2C9` / `#7A5600` | Pastille pilier Inclusion |

## Typographie

| Token | Valeur | Usage |
|---|---|---|
| `--font-sans` | Source Sans 3, Helvetica… | Toute l'UI |
| `--font-serif` | Source Serif 4, Georgia… | Avis éditoriaux et citations (italique) |
| `--font-mono` | ui-monospace… | Chemins de fichiers |
| `--text-xs` → `--text-2xl` | 11 / 13 / 14 / 16 / 18 / 22 / 30 px | xs = labels majuscules ; sm-md = cœur d'UI ; xl-2xl = titres |
| `--weight-regular/semibold/bold` | 400 / 600 / 700 | |
| `--leading-normal` | 1.5 | |
| `--tracking-caps` | 0.08em | Labels en majuscules |

Note : les polices Google (Source Sans 3 / Source Serif 4) ne sont chargées pour l'instant **que** dans `/style-guide` (`next/font/google`). Le passage global se fera à la refonte (chargement dans `layout.tsx`).

## Espacements, arrondis, ombres

- `--space-1..8` : 4, 8, 12, 16, 20, 24, 32 px.
- `--radius-sm/md/card/lg/pill` : 6, 8, 10, 12, 999 px (`card` = cartes et accordéons de la maquette).
- Ombres teintées navy : `--shadow-card` (cartes), `--shadow-sticky` (barre CTA sticky), `--shadow-pop` (tooltips/modales), `--shadow-drawer` (panneau latéral).

## Branchement à faire lors de la refonte (rien de fait dans cette tranche)

| Existant | Remplacer par |
|---|---|
| `--blue` (globals.css) | `--color-primary` |
| `--gold` | `--color-accent` |
| `--red` | `--color-alert` |
| `--bg #F6F6FA` / `--surface` / `--ink #16162b` / `--muted #6a6a80` / `--line #ECECF3` | `--color-bg` / `--color-surface` / `--color-ink` / `--color-muted` / `--color-line` (valeurs légèrement différentes : maquette = vérité) |
| `--ok #1e6b34` / `--mid #a8720a` / `--ko #b3261e` + classes `.v-*`, `.r-*`, `.m-*` | triplets `--status-*` |
| `SCORE_COLOR` / `SCORE_TXT` dans `src/components/ScoreTag.tsx` (maps TS en dur) | `var(--score-…-sel-bg / -sel-txt)` |
| `STATUT` / `MATURITE` dans `src/components/GapResults.tsx` | classes stylées par `--status-*` |
| `--radius 12px` | `--radius-lg` |
| ~43 `style={{…}}` inline dans les composants | tokens espacements/couleurs |
