import type { CSSProperties } from "react";

export const metadata = { title: "Style guide — Détective DD" };

const COLOR_GROUPS: { title: string; tokens: [string, string][] }[] = [
  {
    title: "Marque",
    tokens: [
      ["--color-primary", "#000191"],
      ["--color-primary-hover", "#1A1AAE"],
      ["--color-link-hover", "#3535B8"],
      ["--color-accent", "#FDC533"],
      ["--color-accent-ink", "#3A2E00"],
      ["--color-accent-border", "#C9A227"],
      ["--color-alert", "#E2231A"],
    ],
  },
  {
    title: "Neutres",
    tokens: [
      ["--color-bg", "#F2F3F8"],
      ["--color-surface", "#FFFFFF"],
      ["--color-ink", "#17173A"],
      ["--color-ink-soft", "#41415E"],
      ["--color-muted", "#6A6A85"],
      ["--color-faint", "#8A8AA5"],
      ["--color-line", "#E2E3EE"],
      ["--color-line-soft", "#EEEFF6"],
      ["--color-primary-tint", "#EBEBF9"],
      ["--color-primary-faint", "#F5F5FD"],
    ],
  },
  {
    title: "Statuts d'exigence (couvert / partiel / manquant)",
    tokens: [
      ["--status-ok", "#1E7A3C"],
      ["--status-ok-tint", "#E9F5EC"],
      ["--status-ok-border", "#BFE3CA"],
      ["--status-mid", "#8A6100"],
      ["--status-mid-tint", "#FBF3DC"],
      ["--status-mid-border", "#F3E3AC"],
      ["--status-ko", "#E2231A"],
      ["--status-ko-tint", "#FCEBEA"],
      ["--status-ko-border", "#F5C6C2"],
    ],
  },
  {
    title: "Piliers",
    tokens: [
      ["--pillar-planete-bg", "#E9F5EC"],
      ["--pillar-planete-ink", "#1E7A3C"],
      ["--pillar-inclusion-bg", "#FFF2C9"],
      ["--pillar-inclusion-ink", "#7A5600"],
    ],
  },
];

const SCALE: { key: string; note: string; label: string; neutral?: boolean }[] = [
  { key: "m2", note: "−2", label: "Désaligné" },
  { key: "m1", note: "−1", label: "Enjeu mal géré" },
  { key: "0", note: "0", label: "Pas d'enjeu", neutral: true },
  { key: "p1", note: "+1", label: "Pris en compte" },
  { key: "p2", note: "+2", label: "Qualifie l'objectif stratégique" },
  { key: "p3", note: "+3", label: "Excellence" },
];

const TEXT_SIZES = ["--text-xs", "--text-sm", "--text-md", "--text-base", "--text-lg", "--text-xl", "--text-2xl"];
const SPACES = ["--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-8"];
const RADII = ["--radius-sm", "--radius-md", "--radius-lg", "--radius-pill"];
const SHADOWS = ["--shadow-card", "--shadow-sticky", "--shadow-pop", "--shadow-drawer"];

const h2: CSSProperties = {
  fontSize: "var(--text-lg)",
  fontWeight: 700,
  borderBottom: "2px solid var(--color-accent)",
  paddingBottom: "var(--space-2)",
  margin: "var(--space-8) 0 var(--space-4)",
};

const mono: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-muted)" };

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-sm)",
          background: `var(${name})`,
          border: "1px solid var(--color-line)",
          flexShrink: 0,
        }}
      />
      <span style={{ display: "flex", flexDirection: "column" }}>
        <code style={{ ...mono, color: "var(--color-ink)" }}>{name}</code>
        <span style={mono}>{hex}</span>
      </span>
    </div>
  );
}

export default function StyleGuide() {
  return (
    <main
      style={{
        fontFamily: "var(--font-sans)",
        background: "var(--color-bg)",
        color: "var(--color-ink)",
        minHeight: "100vh",
        lineHeight: "var(--leading-normal)",
        padding: "var(--space-8) var(--space-5) 80px",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <p
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-caps)",
            color: "var(--color-muted)",
            margin: 0,
          }}
        >
          Détective DD — thème de la maquette Claude design
        </p>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, margin: "var(--space-2) 0 0" }}>Style guide</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-md)" }}>
          Tous les éléments de cette page consomment exclusivement les variables de <code style={mono}>src/app/theme.css</code>.
        </p>

        {COLOR_GROUPS.map((g) => (
          <section key={g.title}>
            <h2 style={h2}>{g.title}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "var(--space-4)" }}>
              {g.tokens.map(([name, hex]) => (
                <Swatch key={name} name={name} hex={hex} />
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 style={h2}>Échelle de notation −2 … +3</h2>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {SCALE.map((s) => (
              <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", minWidth: 118, flex: 1 }}>
                <div
                  style={{
                    background: `var(--score-${s.key}-tint)`,
                    color: `var(--score-${s.key}-txt)`,
                    border: s.neutral ? "1px solid var(--score-0-border)" : "1px solid transparent",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-2) var(--space-3)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {s.note} · {s.label}
                </div>
                <div
                  style={{
                    background: `var(--score-${s.key}-sel-bg)`,
                    color: `var(--score-${s.key}-sel-txt)`,
                    border: s.neutral ? "1px solid var(--score-0-border-sel)" : "1px solid transparent",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-2) var(--space-3)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  sélectionné
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={h2}>Typographie</h2>
          {TEXT_SIZES.map((t) => (
            <p key={t} style={{ fontSize: `var(${t})`, margin: "0 0 var(--space-2)" }}>
              <code style={mono}>{t}</code> — Notation Développement Durable (regular <b style={{ fontWeight: 600 }}>semibold</b>{" "}
              <b style={{ fontWeight: 700 }}>bold</b>)
            </p>
          ))}
          <blockquote
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "var(--text-base)",
              color: "var(--color-ink-soft)",
              borderLeft: "3px solid var(--color-accent)",
              margin: "var(--space-4) 0 0",
              padding: "var(--space-1) 0 var(--space-1) var(--space-4)",
            }}
          >
            --font-serif — « Le dossier couvre l'essentiel de l'exigence, mais la politique d'efficacité énergétique reste à
            documenter. » (avis éditoriaux et citations)
          </blockquote>
        </section>

        <section>
          <h2 style={h2}>Espacements</h2>
          {SPACES.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-1)" }}>
              <code style={{ ...mono, width: 90 }}>{s}</code>
              <span style={{ display: "inline-block", width: `var(${s})`, height: 14, background: "var(--color-primary)" }} />
            </div>
          ))}
        </section>

        <section>
          <h2 style={h2}>Arrondis &amp; ombres</h2>
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
            {RADII.map((r) => (
              <div
                key={r}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  borderRadius: `var(${r})`,
                  padding: "var(--space-3) var(--space-4)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <code style={mono}>{r}</code>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap", marginTop: "var(--space-5)" }}>
            {SHADOWS.map((s) => (
              <div
                key={s}
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: `var(${s})`,
                  padding: "var(--space-4) var(--space-5)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <code style={mono}>{s}</code>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={h2}>Exemples composés</h2>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
            {(
              [
                ["Couvert", "ok"],
                ["Partiel", "mid"],
                ["Manquant", "ko"],
              ] as const
            ).map(([label, k]) => (
              <span
                key={k}
                style={{
                  background: `var(--status-${k}-tint)`,
                  color: `var(--status-${k})`,
                  border: `1px solid var(--status-${k}-border)`,
                  borderRadius: "var(--radius-pill)",
                  padding: "var(--space-1) var(--space-3)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              style={{
                background: "var(--color-primary)",
                color: "var(--color-surface)",
                border: 0,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-4)",
                fontSize: "var(--text-md)",
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Analyser le dossier →
            </button>
            <span
              style={{
                background: "var(--color-accent)",
                color: "var(--color-accent-ink)",
                border: "1px solid var(--color-accent-border)",
                borderRadius: "var(--radius-pill)",
                padding: "var(--space-1) var(--space-3)",
                fontSize: "var(--text-sm)",
                fontWeight: 700,
                alignSelf: "center",
              }}
            >
              Accent or (marque)
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
