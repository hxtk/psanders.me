type SearchEntry = {
  url: string;
  title?: string;
  description?: string;
  chunk: string;
  embedding: number[]; // USE is 512 floats
};

export type { SearchEntry };
