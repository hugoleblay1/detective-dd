/** Pastille de note colorée selon l'échelle DD (portage de styleChip du prototype). */
import React from "react";

export const SCORE_COLOR: Record<string, string> = {
  "-2": "#b71c14", "-1": "#E2231A", "0": "#eef6ec", "+1": "#bcdeb0", "+2": "#5fa86a", "+3": "#1e6b34",
};
export const SCORE_TXT: Record<string, string> = {
  "-2": "#fff", "-1": "#fff", "0": "#2f5e2f", "+1": "#234f23", "+2": "#fff", "+3": "#fff",
};
const LIGHT = new Set(["0", "+1"]);

export function scoreStyle(note: string): React.CSSProperties {
  const st: React.CSSProperties = { background: SCORE_COLOR[note] ?? "#999", color: SCORE_TXT[note] ?? "#fff" };
  if (LIGHT.has(note)) st.border = "1px solid rgba(31,90,44,.28)";
  return st;
}

export function ScoreTag({ note, className = "", style }: { note: string; className?: string; style?: React.CSSProperties }) {
  return <span className={className} style={{ ...scoreStyle(note), ...style }}>{note}</span>;
}
