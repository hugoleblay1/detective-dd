/**
 * Mise en gras des éléments signifiants d'un texte de grille (portage de `hl()` du prototype).
 * Retourne des nœuds React (pas de dangerouslySetInnerHTML) : les plages détectées par les
 * motifs sont fusionnées, le reste est laissé en texte brut (échappé par React).
 */
import React from "react";

const HL_PATTERNS: RegExp[] = [
  /(?:≥|≤|>|<)?\s*\d+(?:[.,]\d+)?\s*%/g,
  /co-?bénéfices(?:\s+(?:climat\s+)?(?:adaptation|atténuation))?/gi,
  /populations?\s+(?:et\/ou\s+(?:de\s+)?territoires\s+)?défavoris[ée]e?s?/gi,
  /territoires?\s+défavoris[ée]s?/gi,
  /analyse\s+d(?:u|es)\s+risques?\s+climatiques?(?:\s+physiques?)?/gi,
  /risques?\s+climatiques?\s+physiques?/gi,
  /certifications?/gi, /\bEDGE\b/g, /\bLEED\b/g, /\bPUE\b/g,
  /bilan\s+(?:carbone|GES|gaz\s+à\s+effets?\s+de\s+serre)/gi,
  /plan\s+de\s+transition(?:\s+climatique)?/gi,
  /Accord\s+de\s+Paris/g, /2X\s+Challenge/gi, /Gender\s+boost/gi,
  /gouvernance\s+et\s+responsabilité/gi,
  /politique\s+anti[- ]?harc[èe]lement/gi,
  /services?\s+essentiels?/gi, /fracture\s+numérique/gi,
  /zones?\s+rurales?/gi, /zones?\s+blanches?/gi,
  /Finance\s+de\s+[Tt]ransition(?:\s+Adaptation)?/g,
  /accompagnement(?:\s+technique)?(?:\s+du\s+client)?/gi,
  /efficacité\s+énergétique/gi, /énergies?\s+renouvelables?/gi,
  /stress\s+hydrique/gi, /prérequis/gi, /couverture\s+(?:numérique|mobile)/gi,
  /non\s+applicable/gi,
  // élargissement — vocabulaire de la méthodologie de notation
  /att[ée]nuation/gi, /adaptation/gi,
  /vuln[ée]rabilit[ée](?:\s+climatique)?/gi, /r[ée]silience/gi,
  /(?:gaz\s+à\s+effets?\s+de\s+serre|\bGES\b)/g,
  /[ée]missions?(?:\s+(?:de\s+)?(?:GES|CO2|carbone))?/gi,
  /trajectoire(?:\s+(?:bas\s+carbone|1[.,]5\s*°?\s*C?|2\s*°?\s*C?))?/gi,
  /\bISO\s?\d{4,5}\b/g, /\bPPA\b/g, /\bWUE\b/g,
  /refroidissement(?:\s+adiabatique)?/gi,
  /[ée]conomie\s+circulaire/gi, /déchets?/gi,
  /biodiversit[ée]/gi, /aires?\s+prot[ée]g[ée]es?/gi, /ressources?\s+naturelles?/gi,
  /al[ée]as?(?:\s+(?:climatiques?|naturels?))?/gi,
  /inclusi(?:on|f|ve|ves|fs)/gi, /exclusion/gi,
  /emplois?(?:\s+(?:décents?|inclusifs?))?/gi,
  /cha[îi]nes?\s+(?:de\s+valeur|d['’]approvisionnement)/gi,
  /formation(?:\s+professionnelle)?/gi,
  /\b2X(?:\s+Challenge)?\b/g, /parit[ée]/gi,
  /gouvernance/gi, /harc[èe]lement/gi,
  /objectifs?\s+(?:strat[ée]giques?|explicites?|d['’]impact)/gi,
  /additionnalit[ée]/gi,
];

export function highlight(input: string | null | undefined): React.ReactNode {
  const text = input ?? "";
  if (!text) return text;
  const ranges: Array<[number, number]> = [];
  for (const p of HL_PATTERNS) {
    p.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.exec(text)) !== null) {
      if (m[0].length === 0) { p.lastIndex++; continue; }
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  if (!ranges.length) return text;
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const out: React.ReactNode[] = [];
  let i = 0, k = 0;
  for (const [s, e] of merged) {
    if (s > i) out.push(text.slice(i, s));
    out.push(<b key={k++}>{text.slice(s, e)}</b>);
    i = e;
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}
