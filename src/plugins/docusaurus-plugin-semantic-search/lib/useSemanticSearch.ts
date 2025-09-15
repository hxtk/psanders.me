import { useCallback, useState } from "react";

import type { UniversalSentenceEncoder } from "@tensorflow-models/universal-sentence-encoder";

import type { SearchEntry } from "./indexResource";
import { cosineSim } from "./similarity";

export type SearchResult = {
  url: string;
  title?: string;
  description?: string;
  score: number;
  matchedChunk?: string;
};

export function useSemanticSearchFactory(
  model: UniversalSentenceEncoder,
  index: SearchEntry[],
) {
  // Preconvert embeddings to Float32Array for speed
  const preprocessed = index.map((e) => ({
    ...e,
    _emb: new Float32Array(e.embedding),
  }));

  // returns search function and a convenience helper
  const search = useCallback(
    async (query: string, k = 8): Promise<SearchResult[]> => {
      if (!query || query.trim().length === 0) return [];

      // Load model and create query embedding
      const embTensor = await model.embed([query]);
      const embArr = (await embTensor.array()) as number[][];
      const qvec = new Float32Array(embArr[0]);

      // Score all chunks
      const scored = preprocessed.map((entry) => {
        const s = cosineSim(qvec, entry._emb);
        return {
          url: entry.url,
          title: entry.title,
          description: entry.description,
          score: s,
          chunk: entry.chunk,
        };
      });

      // Aggregate by url: pick max chunk score per document
      const map = new Map<string, SearchResult>();
      for (const s of scored) {
        const existing = map.get(s.url);
        if (!existing || s.score > existing.score) {
          map.set(s.url, {
            url: s.url,
            title: s.title,
            description: s.description,
            score: s.score,
            matchedChunk: s.chunk,
          });
        }
      }

      // Convert to array, sort
      const results = Array.from(map.values()).sort(
        (a, b) => b.score - a.score,
      );
      return results.slice(0, k);
    },
    [preprocessed],
  );

  return { search };
}
