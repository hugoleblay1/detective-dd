/**
 * Sources de contexte EXTERNES (publiques) par dimension — portées du prototype.
 * Les documents internes (bibliothèque IMP) sont hors périmètre ici : ils arriveront
 * avec l'écran de qualification + persistance (voir BACKLOG.md, tranche Bibliothèque).
 */
import type { DimKey } from "./grid";

export interface Country { slug: string; iso3: string; th: string | null }
export interface CtxSource { name: string; desc: string; url: (c: Country | null) => string }
export interface CtxTheme { theme: string; color: string; dim: DimKey; sources: CtxSource[] }

export const normGeo = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/\s+/g, " ").trim();

const COUNTRY: Record<string, Country> = {
  kenya: { slug: "kenya", iso3: "KEN", th: "133" },
  nigeria: { slug: "nigeria", iso3: "NGA", th: null },
  morocco: { slug: "morocco", iso3: "MAR", th: null }, maroc: { slug: "morocco", iso3: "MAR", th: null },
  senegal: { slug: "senegal", iso3: "SEN", th: null }, "cote divoire": { slug: "cote-divoire", iso3: "CIV", th: null },
  armenie: { slug: "armenia", iso3: "ARM", th: "13" }, armenia: { slug: "armenia", iso3: "ARM", th: "13" },
  jordanie: { slug: "jordan", iso3: "JOR", th: "130" }, jordan: { slug: "jordan", iso3: "JOR", th: "130" },
};
export const geoInfo = (geo: string): Country | null => COUNTRY[normGeo(geo)] ?? null;

export const CTX: CtxTheme[] = [
  { theme: "Climat — adaptation", color: "#4d7fd6", dim: "Adaptation", sources: [
    { name: "WRI Aqueduct", desc: "Stress hydrique & risque inondation", url: () => "https://www.wri.org/applications/aqueduct/water-risk-atlas/" },
    { name: "ThinkHazard!", desc: "Aléas : chaleur, inondation, cyclone", url: (c) => (c && c.th) ? `https://thinkhazard.org/en/report/${c.th}-${c.slug}/` : "https://thinkhazard.org/en/" },
    { name: "ND-GAIN", desc: "Vulnérabilité & préparation climatique", url: (c) => c ? `https://gain-new.crc.nd.edu/country/${c.slug}` : "https://gain.nd.edu/our-work/country-index/" },
  ] },
  { theme: "Climat — atténuation", color: "#1a4fb0", dim: "Atténuation", sources: [
    { name: "IEA", desc: "Mix énergétique & électricité", url: (c) => c ? `https://www.iea.org/countries/${c.slug}` : "https://www.iea.org/countries" },
    { name: "Ember", desc: "Intensité carbone du réseau", url: () => "https://ember-energy.org/data/electricity-data-explorer/" },
  ] },
  { theme: "Accès & inclusion", color: "#1f7a44", dim: "Social", sources: [
    { name: "World Bank", desc: "Pauvreté, revenu, inclusion", url: (c) => c ? `https://data.worldbank.org/country/${c.slug}` : "https://data.worldbank.org/topic/poverty" },
    { name: "ITU DataHub", desc: "Connectivité & fracture numérique", url: () => "https://datahub.itu.int/" },
    { name: "GSMA", desc: "Couverture mobile & zones non desservies", url: () => "https://www.mobileconnectivityindex.com/" },
  ] },
  { theme: "Biodiversité", color: "#639922", dim: "Biodiversité", sources: [
    { name: "Protected Planet", desc: "Aires protégées (WDPA)", url: (c) => c ? `https://www.protectedplanet.net/country/${c.iso3}` : "https://www.protectedplanet.net/" },
    { name: "IBAT", desc: "Zones clés de biodiversité", url: () => "https://www.ibat-alliance.org/" },
  ] },
  { theme: "Genre", color: "#a8366b", dim: "Genre", sources: [
    { name: "World Bank Gender Data", desc: "Écarts femmes-hommes", url: (c) => c ? `https://genderdata.worldbank.org/en/economies/${c.slug}` : "https://genderdata.worldbank.org/" },
  ] },
];
export const ctxForDim = (dk: DimKey | null): CtxTheme | null => CTX.find((x) => x.dim === dk) ?? null;
