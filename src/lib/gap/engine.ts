/**
 * Moteur d'analyse d'écart — un appel LLM PAR dimension (jamais un appel global :
 * sorties courtes = pas de troncature JSON), contrat de sortie validé par zod.
 * L'agent ne propose JAMAIS de note : il évalue la couverture.
 */
import { getProvider, type LLMProvider } from "../llm";
import { SectorGrid, DimKey, critsForNote, questionsFor, exigence, defsForDim, type MethodDefinition } from "../grid";
import { loadDefinitions } from "../grid.loader";
import { getDimContext } from "../context";
import { listQualified } from "../library.server";
import { searchLibrary, type LibraryPassage } from "../rag.server";
import { libForDim, isRagIndexable, type LibraryDoc } from "../library";
import { BlockResult, DimSynthesis, type AnalyzeRequest, type AnalyzeTarget, type DimAnalysis } from "./types";

export * from "./types";

/* Référentiel méthodologique du client pour la dimension — prime sur toute
   acception générique des termes (ex. « territoires défavorisés »). */
function defsBlock(defs: MethodDefinition[]): string {
  if (defs.length === 0) return "";
  return `Référentiel méthodologique du client — ces définitions PRIMENT sur toute acception générique ; applique-les pour interpréter les données et les critères :
${defs.map((d) => `### ${d.terme}\n${d.definition}`).join("\n")}\n`;
}

/* Extraits RAG de la bibliothèque IMP — contenu réel, citable (titre + page). */
function libBlock(passages: LibraryPassage[]): string {
  if (passages.length === 0) return "";
  return `Extraits de la bibliothèque interne (documents qualifiés par l'équipe Impact — si tu t'en sers, cite « titre, p.X ») :
${passages.map((p) => `- [${p.title}${p.page ? `, p.${p.page}` : ""}] ${p.text.slice(0, 700)}`).join("\n")}\n`;
}

function blockPrompt(b: DimAnalysis, req: AnalyzeRequest, docs: string, internalSources: string[], defsText: string, libText: string): string {
  return `Tu es un analyste de l'équipe Impact d'une institution de financement du développement. Tu lis et COMPRENDS les documents fournis (contexte, chiffres, engagements — pas une recherche de mots-clés). Tu ne proposes JAMAIS de note.
Dossier: ${req.subtype}, ${req.geo}. Description: """${req.dealText.slice(0, 2500)}"""
Documents du client:
${docs || "(aucun document fourni)"}

Dimension analysée: ${b.dim} — note visée ${b.note}${b.crit ? ` — critère visé : ${b.crit}` : ""}
Exigence de la grille:
${b.exigence.slice(0, 1500)}
${defsText}Données de contexte officielles (${req.geo}) — chiffres réels ; si tu t'en sers, cite la valeur, l'année et la source :
${b.context.length ? b.context.map((c) => `- ${c.label} : ${c.value}${c.unit} (${c.year}, ${c.source})`).join("\n") : "(aucune donnée de contexte disponible)"}
${libText}Ressources internes disponibles (renvoie le chargé d'affaires vers elles si pertinent ; n'invente PAS leur contenu au-delà des extraits ci-dessus) :
${internalSources.length ? internalSources.map((s) => `- ${s}`).join("\n") : "(aucune)"}
Questions:
${b.questions.map((x) => `- [${x.id}] ${x.q.split("\n").join(" ")}${x.ress ? ` (docs attendus: ${x.ress})` : ""}${x.comm ? `\n  note méthodologique: ${x.comm.split("\n").join(" ")}` : ""}`).join("\n")}

Barème de statut — applique cette procédure à CHAQUE question, dans l'ordre:
1. Identifie la SUBSTANCE littérale de la question: ce qu'elle demande exactement, rien de plus. Les exemples (« Ex : … ») illustrent sans être requis — leur absence ne justifie jamais "partiel" si la substance est documentée autrement. La note méthodologique éclaire l'analyse sans ajouter de conditions. Un objectif « affiché » ou « visé » est satisfait par un objectif chiffré documenté, même non contractuel. « En plus de X… » → la substance est la suite, pas X. Les sous-points numérotés ou à puces sont des angles d'investigation, pas des conditions cumulatives.
2. Cherche dans les documents du client et dans la description du dossier des éléments portant DIRECTEMENT sur cette substance. Ne comptent jamais: slogans et engagements génériques sans donnée ni action, positionnement commercial ou marketing, prix et récompenses, indicateurs d'activité, financiers ou RH d'ensemble sans lien avec la substance (nombre d'abonnés ou de clients, ARPU, chiffre d'affaires, effectifs, part de femmes, heures de formation), données de contexte pays seules, déductions depuis un thème sans lien.
3. AUCUN élément direct → "manquant". Le silence du dossier ou la communication sans substance = "manquant", jamais "partiel", même si le ton du dossier est positif.
4. Les éléments directs couvrent l'essentiel de ce que la question demande → "repondu". Ne rétrograde pas en "partiel" par prudence ni parce qu'un AUTRE aspect du dossier est faible: sans manque précis nommable relevant de cette question, c'est "repondu". Exception: une vérification ou validation explicitement demandée par la question et non réalisée, sur une donnée ni contractuelle ni vérifiée par un tiers → "partiel".
5. Sinon → "partiel": au moins un angle couvert par un élément concret — donnée chiffrée, étude, politique, action correspondant à un exemple cité par la question (la formalisation ou le ciblage manquants deviennent alors le manque à nommer), ou démarche engagée à objet précis mais non aboutie. Un simple renvoi à une documentation future sans aucun contenu n'est PAS un élément concret. Le couvert va dans "disponibles", le manque dans "manquants". Le manque qui justifie "partiel" ne peut être NI l'absence d'un exemple cité par la question (« Ex : … »), NI une condition tirée de la note méthodologique: si c'est le seul manque restant, le statut est "repondu" (règle 4).
Règles impératives:
- Description du dossier: ses affirmations sont citables et comptent comme éléments concrets, mais elles sont déclaratives (rédigées par le chargé d'affaires, non étayées par un document): une question dont les seuls éléments directs viennent de la description est AU MIEUX "partiel", JAMAIS "repondu" — nomme alors en manque le document du client qui étayerait la déclaration. Seuls les documents du client fondent un "repondu".
- Questions de cadrage (« quelles sont les populations/territoires défavorisés… »): juge la pertinence des éléments AU REGARD DU CRITÈRE VISÉ: sans élément portant sur l'inégalité propre à ce critère, "manquant".
- Question de prérequis (« le projet sert-il exclusivement des populations favorisées ? »): des éléments concrets documentés (zones défavorisées desservies, données bénéficiaires, tarification) montrant la desserte de populations défavorisées ou l'ouverture à tous les segments suffisent pour "repondu" — sans exiger une caractérisation socio-économique exhaustive. Le positionnement marketing ne compte pas (cf. 2); sans élément concret, "manquant".
- Conditions cumulatives de l'EXIGENCE (reliées par ET): une condition absente du dossier — négation explicite ou simple silence — ⇒ "manquant", JAMAIS "partiel", même si l'autre condition est pleinement établie et chiffrée: ne la crédite pas pour adoucir le statut. Condition remplie → "disponibles", absente → "manquants". (Une condition abordée par des éléments concrets non finalisés n'est pas absente → règle 5.)
- Conditions reliées par « ou » ou « et/ou » (dans l'exigence ou une question): UNE seule condition remplie suffit — n'exige pas les autres, et ne nomme pas comme manque une alternative non retenue.
- Seuil chiffré (dans l'exigence ou une question): la comparaison valeur documentée vs seuil — les DEUX nombres tels qu'écrits — doit figurer dans "disponibles" ou "manquants" de la question la plus pertinente. Valeur sous le seuil ⇒ jamais "repondu". Seuil atteint par une donnée documentée et sourcée ⇒ acquis, ne le rétrograde pas.
Citations — règles strictes:
- Les guillemets « » sont RÉSERVÉS aux extraits VERBATIM des documents du client ou de la description du dossier (nomme alors la source: Description du dossier): copie exacte et contiguë ≤15 mots, sans reformulation, sans élision [...], sans fusion de passages. Une ligne de tableau se recopie TELLE QUELLE avec ses séparateurs | (même si elle dépasse 15 mots).
- Donnée de contexte officielle ou extrait de la bibliothèque: cite SANS guillemets (valeur, année, source / titre, p.X).
"disponibles": max 4 points courts, chacun appuyé d'une citation « » + nom de sa source (document du client ou Description du dossier), ou d'une donnée de contexte sourcée. "manquants": max 3 points précis (nommer le document à demander).
Rends EXACTEMENT un verdict par question listée ci-dessus, avec son id tel quel — n'ajoute aucun verdict qui ne corresponde pas à une question.
Réponds STRICTEMENT en JSON compact sans backticks ni texte autour; à l'intérieur des chaînes, n'utilise JAMAIS le guillemet droit " (réserve-le à la syntaxe JSON — dans le texte, utilise « » ou l'apostrophe):
{"verdicts":[{"id":"...","statut":"...","disponibles":["..."],"manquants":["..."]}],"a_redemander":["..."]}`;
}

// Avis qualitatif consolidé — appel dédié, lancé APRÈS la couverture de la même
// dimension et nourri de ses verdicts, pour rester cohérent avec le tableau.
function synthPrompt(b: DimAnalysis, req: AnalyzeRequest, docs: string, internalSources: string[], defsText: string, libText: string): string {
  const verdicts = b.result.verdicts.length
    ? b.result.verdicts.map((v) => `- [${v.statut}] ${v.id}${v.manquants.length ? ` — manque: ${v.manquants.join("; ")}` : ""}`).join("\n")
    : "(couverture non établie)";
  return `Tu es un analyste de l'équipe Impact d'une institution de financement du développement. Tu produis un AVIS QUALITATIF sur la qualité et la complétude du DOSSIER pour une dimension.
RÈGLE ABSOLUE — tu ne proposes JAMAIS de note, ni explicitement ni implicitement (pas de « mérite +2 », « atteint le niveau +3 », « note X »). Tu n'évalues pas le MÉRITE du projet : tu évalues si le DOSSIER est assez documenté pour qu'un humain instruise. La note est une décision humaine, hors de ton rôle.
Dossier: ${req.subtype}, ${req.geo}. Description: """${req.dealText.slice(0, 2500)}"""
Documents du client:
${docs || "(aucun document fourni)"}
Dimension analysée: ${b.dim} — note visée ${b.note}${b.crit ? ` — critère visé : ${b.crit}` : ""}
Exigence de la grille:
${b.exigence.slice(0, 1500)}
${defsText}Données de contexte officielles (${req.geo}) — chiffres réels ; si tu t'en sers, cite la valeur, l'année et la source :
${b.context.length ? b.context.map((c) => `- ${c.label} : ${c.value}${c.unit} (${c.year}, ${c.source})`).join("\n") : "(aucune donnée de contexte disponible)"}
${libText}Ressources internes disponibles (pointeurs, n'invente PAS leur contenu au-delà des extraits ci-dessus) :
${internalSources.length ? internalSources.map((s) => `- ${s}`).join("\n") : "(aucune)"}
Couverture déjà établie question par question (appuie-toi dessus pour rester cohérent) :
${verdicts}

Produis :
- "forces": max 4, ce que le dossier ÉTABLIT réellement. CHACUNE avec "citation": soit un extrait VERBATIM ≤15 mots entre « » copié tel quel d'un document du client ou de la description du dossier + nom de la source (ligne de tableau recopiée avec ses séparateurs |, même si >15 mots ; sans reformulation ni élision [...]), soit une donnée de contexte officielle SANS guillemets (valeur, année, source). Pas d'appui citable ⇒ ce n'est pas une force. Une affirmation qui ne repose QUE sur la description du dossier est déclarative : signale « (déclaratif, à étayer) » dans le point.
- "faiblesses": max 4, ce qui est faible, vague ou absent. "citation" seulement si l'élément EST présent mais insuffisant ; une absence n'a pas de citation.
- "a_obtenir": max 4, documents/preuves précis à demander au client (nomme le document).
- "maturite": {"niveau":"complet"|"partiel"|"insuffisant","justification":"…"} — niveau = à quel point le DOSSIER fournit les éléments attendus par l'exigence de la note visée (complétude documentaire), JAMAIS le niveau de performance du projet ni une note. justification = une phrase, sans aucun chiffre de note.
Réponds STRICTEMENT en JSON compact sans backticks ni texte autour; à l'intérieur des chaînes, n'utilise JAMAIS le guillemet droit " (réserve-le à la syntaxe JSON — dans le texte, utilise « » ou l'apostrophe):
{"forces":[{"point":"…","citation":"« … » — Doc"}],"faiblesses":[{"point":"…"}],"a_obtenir":["…"],"maturite":{"niveau":"partiel","justification":"…"}}`;
}

/* Vérification des citations (règle 5) : tout extrait entre « » doit exister
   verbatim dans les documents du client ou la description du dossier
   (normalisation : casse, accents, espaces). */
const normCite = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[«»"']/g, " ").replace(/\s+/g, " ").trim();
const extractQuotes = (s: string): string[] => [...s.matchAll(/«([^»]{6,})»/g)].map((m) => m[1].trim());
const badQuotes = (texts: string[], corpusNorm: string): string[] =>
  texts.flatMap(extractQuotes).filter((q) => !corpusNorm.includes(normCite(q)));

function citationFixNote(previous: unknown, bad: string[]): string {
  return `\n\nCORRECTION — ta réponse précédente:\n${JSON.stringify(previous)}\nCes citations ne figurent PAS mot pour mot dans les documents du client ni dans la description du dossier: ${bad.map((q) => `« ${q} »`).join(" ; ")}.\nRenvoie le MÊME JSON en corrigeant UNIQUEMENT ces citations: remplace chacune par un extrait exact copié tel quel du document, ou supprime le point si aucun extrait exact ne l'appuie. Ne change ni les statuts ni le reste.`;
}

function parseLLMJson(txt: string): unknown {
  const i = txt.indexOf("{"); const j = txt.lastIndexOf("}");
  if (i < 0 || j <= i) throw new Error("réponse sans JSON");
  const raw = txt.slice(i, j + 1);
  try {
    return JSON.parse(raw);
  } catch {
    // Réparation minimale des malformations LLM courantes (virgule finale,
    // virgule oubliée entre objets) avant de renoncer — l'échec reste explicite.
    return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1").replace(/}\s*{/g, "},{"));
  }
}

/* Appel LLM + parse, avec ré-essais : une erreur transitoire (surcharge API,
   JSON malformé) ne doit pas vider la couverture d'une dimension entière.
   Température 0 au premier essai (analyse reproductible), relevée aux ré-essais
   pour ne pas rejouer à l'identique une sortie malformée.
   Ré-essais épuisés → erreur explicite (règle 5, jamais de repli silencieux). */
async function completeParsed<T>(provider: LLMProvider, prompt: string, maxTokens: number, parse: (u: unknown) => T): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2000 * attempt));
    try {
      return parse(parseLLMJson(await provider.complete(prompt, { maxTokens, temperature: attempt ? 0.8 : 0 })));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function analyze(grid: SectorGrid, req: AnalyzeRequest): Promise<DimAnalysis[]> {
  const provider = getProvider("analyse");
  // 80k caractères ≈ 25-30 pages retranscrites : assez pour les rapports du
  // dossier sans coupure des tableaux en fin de document (contexte 1M côté modèle).
  const docs = req.docs.map((d) => `### ${d.name}\n${d.text.slice(0, 80000)}`).join("\n\n");
  // La description du dossier (texte CHAFF) est citable — mais plafonnée à
  // « partiel » par le barème : seuls les documents client fondent un « repondu ».
  const corpusNorm = normCite([req.dealText, ...req.docs.map((d) => d.text)].join(" "));
  const qualified: LibraryDoc[] = await listQualified().catch(() => []);

  const blocks: DimAnalysis[] = (Object.entries(req.targets) as [DimKey, AnalyzeTarget][]).map(([dk, t]) => {
    const pool = critsForNote(grid, req.subtype, dk, t.note);
    const crit = t.crit && pool.includes(t.crit) ? t.crit : pool.length > 1 ? pool[0] : pool[0] ?? null;
    const questions = questionsFor(grid, req.subtype, dk, crit, t.note)
      .map((q, i) => ({ id: dk.slice(0, 3).toUpperCase() + (i + 1), q: q.question, ress: q.ressources ?? "", comm: q.commentaire ?? "" }));
    return {
      dim: dk, note: t.note, crit,
      exigence: exigence(grid, req.subtype, dk, t.note, crit),
      questions, context: [], library: [], result: { verdicts: [], a_redemander: [] }, engine: "ia",
      synthesis: null,
    };
  });

  const definitions = loadDefinitions();
  await Promise.all(blocks.map(async (b) => {
    b.context = await getDimContext(b.dim, req.geo);
    const libDocs = libForDim(qualified, b.dim, req.geo);
    const internalSources = libDocs.map((d) => `${d.title} (${d.geoName})`);
    // Doc qualifié à 0 passage sur un format indexable : l'indexeur n'est pas
    // encore passé — signalé à l'analyste (sinon la bibliothèque est muette sans raison visible).
    const notIndexed = libDocs.filter((d) => d.chunks === 0 && isRagIndexable(d.file)).map((d) => d.title ?? d.file);
    if (notIndexed.length) b.libraryNotIndexed = notIndexed;
    const defsText = defsBlock(defsForDim(definitions, b.dim));

    // RAG : passages de la bibliothèque IMP pour cette dimension. Échec →
    // absence signalée (libraryError), l'analyse continue avec les pointeurs.
    let passages: LibraryPassage[] = [];
    try {
      passages = await searchLibrary(
        `${b.dim}${b.crit ? ` — critère ${b.crit}` : ""} — ${req.subtype}, ${req.geo}. ${b.exigence.slice(0, 600)}`,
        libDocs.map((d) => d.id));
    } catch (e) {
      b.libraryError = e instanceof Error ? e.message : String(e);
    }
    const byTitle = new Map<string, number[]>();
    for (const p of passages) {
      const pages = byTitle.get(p.title) ?? [];
      if (p.page !== null && !pages.includes(p.page)) pages.push(p.page);
      byTitle.set(p.title, pages);
    }
    b.library = [...byTitle.entries()].map(([title, pages]) => ({ title, pages: pages.sort((a, z) => a - z) }));
    const libText = libBlock(passages);

    try {
      const prompt = blockPrompt(b, req, docs, internalSources, defsText, libText);
      let parsed = await completeParsed(provider, prompt, 3000, (u) => BlockResult.parse(u));
      let bad = badQuotes(parsed.verdicts.flatMap((v) => v.disponibles), corpusNorm);
      if (bad.length) { // un seul retry ciblé ; s'il échoue, on GARDE la 1re réponse (les statuts restent valides)
        try {
          parsed = await completeParsed(provider, prompt + citationFixNote(parsed, bad), 3000, (u) => BlockResult.parse(u));
        } catch { /* correction impossible : les citations fautives seront filtrées ci-dessous */ }
        bad = badQuotes(parsed.verdicts.flatMap((v) => v.disponibles), corpusNorm);
        if (bad.length) {
          b.citationsRejetees = bad.length;
          for (const v of parsed.verdicts) v.disponibles = v.disponibles.filter((d) => badQuotes([d], corpusNorm).length === 0);
        }
      }
      // Contrat : un verdict ne peut porter que sur une question posée (un verdict
      // inventé, ex. au niveau de l'exigence, fausserait la couverture).
      const qIds = new Set(b.questions.map((q) => q.id));
      parsed.verdicts = parsed.verdicts.filter((v) => qIds.has(v.id));
      b.result = parsed;
      b.engine = "ia";
    } catch (e) {
      b.engine = "erreur";
      b.error = e instanceof Error ? e.message : String(e);
    }
    // Avis qualitatif : appel dédié, nourri des verdicts ci-dessus. Échoue
    // indépendamment de la couverture (n'invalide pas le tableau).
    try {
      const prompt = synthPrompt(b, req, docs, internalSources, defsText, libText);
      let syn = await completeParsed(provider, prompt, 2000, (u) => DimSynthesis.parse(u));
      // Seules les forces sont vérifiées : une faiblesse peut citer la couverture, pas les docs.
      const bad = badQuotes(syn.forces.map((f) => f.citation), corpusNorm);
      if (bad.length) {
        try {
          syn = await completeParsed(provider, prompt + citationFixNote(syn, bad), 2000, (u) => DimSynthesis.parse(u));
        } catch { /* correction impossible : on garde la 1re synthèse, forces fautives filtrées ci-dessous */ }
        const dropped = syn.forces.filter((f) => badQuotes([f.citation], corpusNorm).length > 0).length;
        if (dropped) {
          b.citationsRejetees = (b.citationsRejetees ?? 0) + dropped;
          syn.forces = syn.forces.filter((f) => badQuotes([f.citation], corpusNorm).length === 0);
        }
      }
      b.synthesis = syn;
    } catch (e) {
      b.synthesisError = e instanceof Error ? e.message : String(e);
    }
  }));
  return blocks;
}
