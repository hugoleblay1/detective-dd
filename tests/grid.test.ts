/**
 * Tests du cœur métier (src/lib/grid.ts) : non-applicabilité, périmètre des
 * critères, logique OR, filtrage des questions, exigence.
 * Deux volets : cas construits (fixture) + invariants sur la grille publiée.
 * Lancer : pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  lvlNA, usableLevels, critExcluded, critNAExpl, naList, singleNoteCrits,
  dimKeyOf, critsForNote, questionsFor, exigence, defsForDim,
  type Criterion, type KeyQuestion, type SectorGrid,
} from "../src/lib/grid";
import { loadGrids } from "../src/lib/grid.loader";

/* ---------- fixture ---------- */

const crit = (criterion: string, levels: Record<string, string>): Criterion =>
  ({ criterion, summary: { levels, example: null }, detail: null });

const Q = (q: Partial<KeyQuestion> & { question: string }): KeyQuestion => ({
  section: null, thematique: null, dimension: null, note_visee: null,
  commentaire: null, ressources: null, ...q,
});

const FIXTURE: SectorGrid = {
  sector: "Test",
  subtypes: {
    T: {
      notation_dd: {
        title: "t",
        dimensions: [
          {
            dimension: "Inclusion (Social)", pillar: "Social", objective: "obj",
            prerequisite: "PRÉREQUIS : contribution significative attendue.",
            connector_note: null, scale: ["0", "+1", "+2", "+3"],
            criteria: [
              crit("Accès", { "0": "Pas d'enjeu identifié.", "+2": "Exigence Accès +2.", "+3": "Exigence Accès +3." }),
              crit("Emplois", { "0": "Pas d'enjeu.", "+1": "Exigence Emplois +1.", "+2": "Exigence Emplois +2." }),
              crit("Territoires", { "0": "Non applicable — se reporter au critère Accès.", "+3": "Exigence Territoires +3." }),
              crit("Chaîne de valeur", {
                "+2": "Non applicable - le critère Accès prévaut.",
                "+3": "Se reporter aux critères Accès et Emplois.",
              }),
            ],
          },
          {
            dimension: "Climat — Adaptation", pillar: "Planète", objective: "obj",
            prerequisite: null, connector_note: null, scale: ["0", "+2"],
            criteria: [crit("Résilience", { "0": "Pas d'enjeu.", "+2": "Exigence Résilience +2." })],
          },
        ],
      },
      key_qs: {
        title: "q",
        questions: [
          Q({ question: "Q générale Social", thematique: "Social", dimension: "" }),
          Q({ question: "Q Accès", thematique: "Social", dimension: "Accès (Inclusion)" }),
          Q({ question: "Q Emplois +2", thematique: "Social", dimension: "Emplois", note_visee: "+2" }),
          Q({ question: "Q Emplois +3 seulement", thematique: "Social", dimension: "Emplois", note_visee: "+3" }),
          Q({ question: "Q contexte Social", thematique: "Social", dimension: "Général" }),
          Q({ question: "Q Adaptation", thematique: "Planète", dimension: "Adaptation" }),
          Q({ question: "Q Biodiversité", thematique: "Planète", dimension: "Biodiversité" }),
          Q({ question: "Q Genre termino", thematique: "Genre", dimension: "Terminologie" }),
          Q({ question: "Q Genre produit", thematique: "Genre", dimension: "Critère produit" }),
        ],
      },
    },
  },
};

/* ---------- non-applicabilité ---------- */

describe("lvlNA — détection d'un niveau non mobilisable", () => {
  test("formes reconnues", () => {
    assert.equal(lvlNA("Non applicable — voir critère Accès"), true);
    assert.equal(lvlNA("  non applicable"), true);
    assert.equal(lvlNA("Critère de notation non applicable pour ce sous-type"), true);
    assert.equal(lvlNA("Se reporter aux critères Accès et Emplois"), true);
    assert.equal(lvlNA("Se reporter au critère Accès"), true);
    assert.equal(lvlNA("Le critère Emplois prévaut sur celui-ci"), true);
  });
  test("faux positifs évités", () => {
    assert.equal(lvlNA("Une politique applicable aux fournisseurs est requise"), false);
    assert.equal(lvlNA("Exigence normale mentionnant un critère solide"), false);
    assert.equal(lvlNA(""), false);
    assert.equal(lvlNA(null), false);
    assert.equal(lvlNA(undefined), false);
  });
});

describe("critExcluded / critNAExpl / naList", () => {
  test("exclu seulement si TOUS les niveaux sont non mobilisables", () => {
    const [acces, , territoires, chaine] = FIXTURE.subtypes.T.notation_dd.dimensions[0].criteria;
    assert.equal(critExcluded(chaine), true);
    assert.equal(critExcluded(territoires), false); // garde un +3 mobilisable
    assert.equal(critExcluded(acces), false);
  });
  test("un critère sans aucun niveau n'est pas exclu", () => {
    assert.equal(critExcluded(crit("Vide", {})), false);
  });
  test("l'explication retire le préfixe « Non applicable »", () => {
    const c = crit("X", { "+2": "Non applicable — le critère Accès prévaut." });
    assert.equal(critNAExpl(c), "le critère Accès prévaut.");
  });
  test("naList ne remonte que les critères entièrement exclus", () => {
    assert.deepEqual(naList(FIXTURE, "T", "Social").map((x) => x.crit), ["Chaîne de valeur"]);
  });
});

describe("usableLevels / singleNoteCrits — périmètre restreint", () => {
  test("les niveaux NA sont masqués", () => {
    const [, , territoires] = FIXTURE.subtypes.T.notation_dd.dimensions[0].criteria;
    assert.deepEqual(Object.keys(usableLevels(territoires.summary.levels)), ["+3"]);
  });
  test("Territoires (un seul niveau ≠ 0) est restreint ; Accès (0 + autres) ne l'est pas", () => {
    assert.deepEqual(singleNoteCrits(FIXTURE, "T", "Social"), [{ crit: "Territoires", note: "+3" }]);
  });
  test("un critère dont il ne reste que le niveau 0 n'est pas « restreint »", () => {
    const g: SectorGrid = JSON.parse(JSON.stringify(FIXTURE));
    g.subtypes.T.notation_dd.dimensions[0].criteria = [
      crit("Base seule", { "0": "Pas d'enjeu.", "+2": "Non applicable." }),
    ];
    assert.deepEqual(singleNoteCrits(g, "T", "Social"), []);
  });
});

/* ---------- accès dimensions / logique OR ---------- */

describe("dimKeyOf", () => {
  test("reconnaît les intitulés réels, avec ou sans accents", () => {
    assert.equal(dimKeyOf("Climat — Atténuation"), "Atténuation");
    assert.equal(dimKeyOf("ATTENUATION"), "Atténuation");
    assert.equal(dimKeyOf("Climat — Adaptation"), "Adaptation");
    assert.equal(dimKeyOf("Inclusion (Social)"), "Social");
    assert.equal(dimKeyOf("Genre"), "Genre");
    assert.equal(dimKeyOf("Biodiversité"), "Biodiversité");
    assert.equal(dimKeyOf("Gouvernance"), null);
    assert.equal(dimKeyOf(""), null);
  });
});

describe("critsForNote — pool de la logique OR", () => {
  test("+2 : critères ayant un niveau +2 mobilisable, exclus retirés", () => {
    assert.deepEqual(critsForNote(FIXTURE, "T", "Social", "+2"), ["Accès", "Emplois"]);
  });
  test("+3 : Territoires entre dans le pool, Chaîne de valeur (NA) jamais", () => {
    assert.deepEqual(critsForNote(FIXTURE, "T", "Social", "+3"), ["Accès", "Territoires"]);
  });
  test("+1 : seul Emplois propose ce niveau", () => {
    assert.deepEqual(critsForNote(FIXTURE, "T", "Social", "+1"), ["Emplois"]);
  });
  test("dimension ou sous-type inconnus → pool vide", () => {
    assert.deepEqual(critsForNote(FIXTURE, "T", "Genre", "+2"), []);
    assert.deepEqual(critsForNote(FIXTURE, "Inconnu", "Social", "+2"), []);
  });
});

/* ---------- questions ---------- */

describe("questionsFor — filtrage dimension × critère × note", () => {
  const names = (qs: KeyQuestion[]) => qs.map((q) => q.question);
  test("Planète : filtrées par dimension exacte", () => {
    assert.deepEqual(names(questionsFor(FIXTURE, "T", "Adaptation", null, null)), ["Q Adaptation"]);
  });
  test("Social sans critère visé : toutes les questions Social", () => {
    assert.equal(questionsFor(FIXTURE, "T", "Social", null, null).length, 5);
  });
  test("Social, critère Accès : les questions des autres critères sortent, les générales restent", () => {
    assert.deepEqual(names(questionsFor(FIXTURE, "T", "Social", "Accès", null)),
      ["Q générale Social", "Q Accès", "Q contexte Social"]);
  });
  test("note visée : garde note correspondante et questions sans note", () => {
    assert.deepEqual(names(questionsFor(FIXTURE, "T", "Social", "Emplois", "+2")),
      ["Q générale Social", "Q Emplois +2", "Q contexte Social"]);
  });
  test("Genre : terminologie toujours là ; critère boost écarte les questions produit", () => {
    assert.deepEqual(names(questionsFor(FIXTURE, "T", "Genre", "2X Boost", null)), ["Q Genre termino"]);
    assert.deepEqual(names(questionsFor(FIXTURE, "T", "Genre", "Critère produit", null)),
      ["Q Genre termino", "Q Genre produit"]);
  });
});

/* ---------- exigence ---------- */

describe("exigence", () => {
  test("+2 : prérequis en tête + logique OR + niveaux des critères mobilisables", () => {
    const ex = exigence(FIXTURE, "T", "Social", "+2", null);
    assert.ok(ex.startsWith("PRÉREQUIS : contribution significative attendue."));
    assert.match(ex, /atteindre le niveau \+2 sur UN SEUL critère suffit/);
    assert.match(ex, /Accès : Exigence Accès \+2\./);
    assert.match(ex, /Emplois : Exigence Emplois \+2\./);
    assert.ok(!ex.includes("Chaîne de valeur"), "un critère exclu ne doit pas apparaître");
    assert.ok(!ex.includes("Non applicable"), "un niveau NA ne doit pas apparaître");
  });
  test("+1 : pas de prérequis (réservé +2/+3)", () => {
    const ex = exigence(FIXTURE, "T", "Social", "+1", null);
    assert.ok(!ex.includes("PRÉREQUIS"));
    assert.match(ex, /Emplois : Exigence Emplois \+1\./);
  });
  test("critère visé : seul ce critère est repris, la mention OR le nomme", () => {
    const ex = exigence(FIXTURE, "T", "Social", "+3", "Territoires");
    assert.match(ex, /critère visé : Territoires/);
    assert.match(ex, /Territoires : Exigence Territoires \+3\./);
    assert.ok(!ex.includes("Exigence Accès"));
  });
  test("un seul critère mobilisable → pas de mention de logique OR", () => {
    const ex = exigence(FIXTURE, "T", "Adaptation", "+2", null);
    assert.ok(!ex.includes("UN SEUL critère"));
    assert.match(ex, /Résilience : Exigence Résilience \+2\./);
  });
});

/* ---------- defsForDim ---------- */

describe("defsForDim", () => {
  test("filtre par dimension", () => {
    const defs = [
      { terme: "A", dims: ["Social" as const], definition: "d" },
      { terme: "B", dims: ["Social" as const, "Genre" as const], definition: "d" },
    ];
    assert.deepEqual(defsForDim(defs, "Social").map((d) => d.terme), ["A", "B"]);
    assert.deepEqual(defsForDim(defs, "Genre").map((d) => d.terme), ["B"]);
    assert.deepEqual(defsForDim(defs, "Adaptation"), []);
  });
});

/* ---------- invariants sur la grille publiée ---------- */

describe("grille publiée (content/) — invariants", () => {
  const grids = Object.values(loadGrids());
  const DIMS = ["Atténuation", "Adaptation", "Social", "Genre", "Biodiversité"] as const;
  const NOTES = ["-1", "0", "+1", "+2", "+3"] as const;

  test("au moins une grille publiée, chaque dimension identifiable", () => {
    assert.ok(grids.length >= 1);
    for (const g of grids)
      for (const st of Object.values(g.subtypes))
        for (const d of st.notation_dd.dimensions)
          assert.notEqual(dimKeyOf(d.dimension), null, `dimension non reconnue : ${d.dimension}`);
  });

  test("le pool OR ne contient jamais un critère exclu ni un niveau NA", () => {
    for (const g of grids)
      for (const sub of Object.keys(g.subtypes))
        for (const dk of DIMS) {
          const d = dimObjLocal(g, sub, dk);
          if (!d) continue;
          const excluded = new Set(naList(g, sub, dk).map((x) => x.crit));
          for (const note of NOTES)
            for (const c of critsForNote(g, sub, dk, note)) {
              assert.ok(!excluded.has(c), `${sub}/${dk}/${note} : critère exclu ${c} dans le pool`);
              const cr = d.criteria.find((x) => x.criterion === c)!;
              assert.ok(!lvlNA(cr.summary.levels[note]), `${sub}/${dk}/${note} : niveau NA retenu pour ${c}`);
            }
        }
  });

  test("l'exigence +2/+3 reprend le prérequis quand la dimension en a un", () => {
    for (const g of grids)
      for (const sub of Object.keys(g.subtypes))
        for (const dk of DIMS) {
          const d = dimObjLocal(g, sub, dk);
          if (!d?.prerequisite) continue;
          for (const note of ["+2", "+3"] as const) {
            const pool = critsForNote(g, sub, dk, note);
            if (pool.length === 0) continue;
            assert.ok(exigence(g, sub, dk, note, pool[0]).includes(d.prerequisite),
              `${sub}/${dk}/${note} : prérequis absent de l'exigence`);
          }
        }
  });

  test("les questions renvoyées appartiennent toujours à la bonne thématique", () => {
    for (const g of grids)
      for (const sub of Object.keys(g.subtypes)) {
        for (const q of questionsFor(g, sub, "Social", null, null)) assert.equal(q.thematique, "Social");
        for (const q of questionsFor(g, sub, "Genre", null, null)) assert.equal(q.thematique, "Genre");
        for (const dk of ["Atténuation", "Adaptation", "Biodiversité"] as const)
          for (const q of questionsFor(g, sub, dk, null, null)) assert.equal(q.thematique, "Planète");
      }
  });

  function dimObjLocal(g: SectorGrid, sub: string, dk: (typeof DIMS)[number]) {
    return g.subtypes[sub]?.notation_dd.dimensions.find((d) => dimKeyOf(d.dimension) === dk);
  }
});
