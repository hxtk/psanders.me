import React, { useEffect, useRef, useState } from "react";

import * as use from "@tensorflow-models/universal-sentence-encoder";
import "@tensorflow/tfjs";

import type { SearchEntry } from "./indexResource";

const modelPromise: Promise<use.UniversalSentenceEncoder> = use.load();
const indexPromise: Promise<SearchEntry[]> = import(
  /* webpackChunkName: "semantic-search-index" */
  "@generated/docusaurus-plugin-semantic-search/default/search-index.json"
).then((m) => m.default);

export function useUseModel(): use.UniversalSentenceEncoder {
  return React.use(modelPromise);
}

// Suspense helper to throw on pending
export function useSearchIndex() {
  return React.use(indexPromise);
}
