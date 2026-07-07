/** Indicateur de contexte sourcé (donnée réelle + source + année). Type pur, client-safe. */
export interface ContextIndicator {
  label: string;
  value: number;
  unit: string;
  year: string;
  source: string;
  sourceUrl: string;
}
