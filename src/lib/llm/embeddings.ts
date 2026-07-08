/**
 * Embeddings — même philosophie que la couche LLM : le moteur ne connaît que
 * l'interface, chaque déploiement choisit son implémentation (EMBEDDINGS_PROVIDER).
 *
 *  - "local" (défaut) : multilingual-e5-small exécuté DANS le processus Node —
 *    aucun document ne sort de l'infrastructure, pas de clé, pas de coût.
 *    Le modèle (~120 Mo) est téléchargé au premier usage puis mis en cache.
 *
 * Convention e5 : préfixes "query: " / "passage: " obligatoires — les textes
 * passent par embedQuery/embedPassages, jamais par un appel brut.
 */
export interface EmbeddingProvider {
  /** Dimension des vecteurs produits (colonne pgvector). */
  readonly dims: number;
  embedPassages(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

class LocalE5Provider implements EmbeddingProvider {
  readonly dims = 384;
  private extractor: Promise<(texts: string[], opts: object) => Promise<{ tolist(): number[][] }>> | null = null;

  private async pipe() {
    if (!this.extractor) {
      this.extractor = import("@huggingface/transformers").then(async ({ pipeline }) => {
        const p = await pipeline("feature-extraction", "Xenova/multilingual-e5-small");
        return (texts: string[], opts: object) => p(texts, opts) as Promise<{ tolist(): number[][] }>;
      });
    }
    return this.extractor;
  }

  private async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const run = await this.pipe();
    const out = await run(texts, { pooling: "mean", normalize: true });
    return out.tolist();
  }

  embedPassages(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((t) => `passage: ${t}`));
  }
  async embedQuery(text: string): Promise<number[]> {
    return (await this.embed([`query: ${text}`]))[0];
  }
}

let instance: EmbeddingProvider | null = null;
export function getEmbeddings(): EmbeddingProvider {
  if (instance) return instance;
  const p = process.env.EMBEDDINGS_PROVIDER ?? "local";
  if (p === "local") return (instance = new LocalE5Provider());
  throw new Error(`EMBEDDINGS_PROVIDER inconnu: ${p}`);
}
