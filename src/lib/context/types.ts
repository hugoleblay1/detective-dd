/** Indicateur de contexte sourcé (donnée réelle + source + année). Type pur, client-safe. */
export interface ContextIndicator {
  label: string;
  /** Chiffre, ou catégorie qualitative sourcée (ex. niveau d'aléa « Élevé »). */
  value: number | string;
  unit: string;
  /** Année ou période ; vide si la source ne date pas la donnée (ThinkHazard). */
  year: string;
  source: string;
  sourceUrl: string;
}
