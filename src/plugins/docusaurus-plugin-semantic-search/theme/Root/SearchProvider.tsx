import React, { createContext, useContext, useEffect, useState } from "react";

import CommandPalette from "./CommandPalette";

type SearchContext = { open: () => void };
const Ctx = createContext<SearchContext | null>(null);

export function useSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSearch must be inside <SearchProvider>");
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Global ⌘K / Ctrl+K binding here (so you don’t duplicate in CommandPalette)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      {isOpen && <CommandPalette onClose={() => setIsOpen(false)} />}
    </Ctx.Provider>
  );
}
