/**
 * Couche d'abstraction LLM — cœur de la reproductibilité du produit.
 * Le moteur d'analyse ne connaît que cette interface ; chaque déploiement
 * choisit son fournisseur par configuration (LLM_PROVIDER).
 *
 *  - "anthropic"  : défaut produit (Claude, clé API par client)
 *  - "internal"   : squelette pour un endpoint client (ex. LLM interne Proparco)
 */
export interface LLMProvider {
  /** Envoie un prompt, retourne le texte brut de la réponse. */
  complete(prompt: string, opts?: { maxTokens?: number }): Promise<string>;
}

class AnthropicProvider implements LLMProvider {
  constructor(
    private apiKey = process.env.ANTHROPIC_API_KEY ?? "",
    private model = process.env.LLM_MODEL ?? "claude-sonnet-4-6",
  ) {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY manquant (.env)");
  }
  async complete(prompt: string, opts?: { maxTokens?: number }): Promise<string> {
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
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
  }
}

/** Adaptateur pour un endpoint interne client (à implémenter par déploiement). */
class InternalProvider implements LLMProvider {
  constructor(private baseUrl = process.env.INTERNAL_LLM_URL ?? "") {
    if (!this.baseUrl) throw new Error("INTERNAL_LLM_URL manquant (.env)");
  }
  async complete(_prompt: string): Promise<string> {
    // TODO (profil Proparco) : implémenter selon le contrat de l'API interne
    // (auth, format de requête/réponse). Le moteur n'a pas à changer.
    throw new Error("InternalProvider non implémenté — voir README, profil de déploiement");
  }
}

export function getProvider(): LLMProvider {
  const p = process.env.LLM_PROVIDER ?? "anthropic";
  if (p === "anthropic") return new AnthropicProvider();
  if (p === "internal") return new InternalProvider();
  throw new Error(`LLM_PROVIDER inconnu: ${p}`);
}
