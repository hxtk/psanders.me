import React, { Suspense } from "react";

import BrowserOnly from "@docusaurus/BrowserOnly";

import { useSearchIndex, useUseModel } from "../../lib/suspenders";
import { useSearch } from "../Root/SearchProvider";
import "./style.css";

function ShortcutHint() {
  return (
    <kbd className="kbd">
      {navigator.platform.includes("Mac") ? "⌘K" : "Ctrl K"}
    </kbd>
  );
}

function ReadyButton() {
  useUseModel();
  useSearchIndex();
  const { open } = useSearch();

  return (
    <button type="button" onClick={open} className="navbar__item navbar__link">
      🔍 Search <ShortcutHint />
    </button>
  );
}

function FallbackButton() {
  return (
    <button
      type="button"
      disabled
      className="navbar__item navbar__link"
      style={{ opacity: 0.5 }}
    >
      🔍 Search <ShortcutHint />
    </button>
  );
}

export default function SemanticSearchNavbarItem() {
  return (
    <div className="navbar__item navbar__search">
      <BrowserOnly>
        {() => (
          <Suspense fallback={<FallbackButton />}>
            <ReadyButton />
          </Suspense>
        )}
      </BrowserOnly>
    </div>
  );
}
