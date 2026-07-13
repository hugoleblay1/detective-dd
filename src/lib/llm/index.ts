/**
 * Couche d'abstraction LLM — cœur de la reproductibilité du produit.
 * Le moteur d'analyse ne connaît que cette interface ; chaque déploiement
 * choisit son fournisseur par configuration (LLM_PROVIDER).
 *
 *  - "anthropic"  : défaut produit (Claude, clé API par client)
 *  - "internal"   : squelette pour un endpoint client (ex. LLM interne Proparco)
 *
 * Routage par tâche (voir PRODUCT.md, Architecture IA) : les tâches mécaniques
 * (extraction, indexation) tournent sur un modèle léger et peu cher ; l'analyse
 * d'écart et l'avis qualitatif sur un modèle de niveau supérieur.
 */
export interface LLMProvider {
  /** Envoie un prompt, retourne le texte brut de la réponse. */
  complete(prompt: string, opts?: { maxTokens?: number; temperature?: number }): Promise<string>;
  /**
   * Lecture native d'un PDF (pages rendues en texte + image : tableaux et
   * graphiques sont réellement lus). Absent si le fournisseur ne le supporte
   * pas — l'appelant doit prévoir un repli signalé.
   */
  extractPdf?(prompt: string, pdfBase64: string, opts?: { maxTokens?: number }): Promise<PdfExtraction>;
}

export interface PdfExtraction {
  text: string;
  /** true si la sortie a été coupée (max_tokens) : fin du document non couverte. */
  truncated: boolean;
}

/** Tâche appelante — détermine le modèle utilisé. */
export type LLMTask = "analyse" | "extraction";

/* Modèles par tâche, surchargeables par déploiement (.env). */
const MODELS: Record<LLMTask, () => string> = {
  analyse: () => process.env.LLM_MODEL ?? "claude-sonnet-4-6",
  extraction: () => process.env.LLM_MODEL_EXTRACTION ?? "claude-haiku-4-5",
};

class AnthropicProvider implements LLMProvider {
  constructor(
    private model: string,
    private apiKey = process.env.ANTHROPIC_API_KEY ?? "",
  ) {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY manquant (.env)");
  }
  async complete(prompt: string, opts?: { maxTokens?: number; temperature?: number }): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts?.maxTokens ?? 2000,
        ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
  }
  async extractPdf(prompt: string, pdfBase64: string, opts?: { maxTokens?: number }): Promise<PdfExtraction> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts?.maxTokens ?? 8000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      stop_reason?: string;
    };
    return {
      text: data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n"),
      truncated: data.stop_reason === "max_tokens",
    };
  }
}

/** Adaptateur pour un endpoint interne client (à implémenter par déploiement). */
class InternalProvider implements LLMProvider {
  // Le routage par tâche s'applique aussi ici : l'endpoint interne recevra le
  // nom de tâche/modèle quand son contrat sera connu (profil Proparco).
  constructor(private task: LLMTask, private baseUrl = process.env.INTERNAL_LLM_URL ?? "") {
    if (!this.baseUrl) throw new Error("INTERNAL_LLM_URL manquant (.env)");
  }
  async complete(_prompt: string): Promise<string> {
    // TODO (profil Proparco) : implémenter selon le contrat de l'API interne
    // (auth, format de requête/réponse). Le moteur n'a pas à changer.
    throw new Error("InternalProvider non implémenté — voir README, profil de déploiement");
  }
}

/** Fournisseur pour une tâche donnée — "analyse" (défaut) ou "extraction". */
export function getProvider(task: LLMTask = "analyse"): LLMProvider {
  const p = process.env.LLM_PROVIDER ?? "anthropic";
  if (p === "anthropic") return new AnthropicProvider(MODELS[task]());
  if (p === "internal") return new InternalProvider(task);
  throw new Error(`LLM_PROVIDER inconnu: ${p}`);
}
