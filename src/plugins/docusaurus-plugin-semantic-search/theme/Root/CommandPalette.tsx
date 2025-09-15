import React, { useState } from "react";

import { useHistory } from "@docusaurus/router";
import { Command } from "cmdk";

import { useSearchIndex, useUseModel } from "../../lib/suspenders";
import { useSemanticSearchFactory } from "../../lib/useSemanticSearch";
import "./command-palette.css";

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const model = useUseModel();
  const index = useSearchIndex();
  const { search } = useSemanticSearchFactory(model, index);
  const history = useHistory();

  const [results, setResults] = useState<any[]>([]);

  return (
    <div className="overlay" onClick={onClose}>
      <Command
        label="Semantic search"
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        shouldFilter={false}
      >
        <Command.Input
          placeholder="Search docs and blog…"
          className="input"
          autoFocus
          onValueChange={async (query) => {
            if (query.length < 2) {
              setResults([]);
              return;
            }
            const hits = await search(query, 8);
            setResults(hits);
          }}
        />
        <Command.List className="list">
          {results.map((item, i) => (
            <Command.Item
              key={i}
              value={item.url}
              onSelect={() => {
                history.push(item.url);
                onClose();
              }}
              className="item"
            >
              <div className="itemTitle">{item.title ?? item.url}</div>
              {item.matchedChunk && (
                <div className="itemSubtitle">
                  {item.matchedChunk.slice(0, 80)}
                  {item.matchedChunk.length > 80 ? "…" : ""}
                </div>
              )}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
