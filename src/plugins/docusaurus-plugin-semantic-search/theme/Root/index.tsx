import React from "react";

import { SearchProvider } from "./SearchProvider";

export default function Root({ children }: { children: React.ReactNode }) {
  return <SearchProvider>{children}</SearchProvider>;
}
