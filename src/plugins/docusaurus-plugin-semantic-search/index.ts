import * as use from "@tensorflow-models/universal-sentence-encoder";
import "@tensorflow/tfjs-node";
import crypto from "crypto";
import fs from "fs-extra";
import glob from "glob";
import path from "path";

import processMetadata from "./metadata";

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function writeEmbedding(filePath, embedding) {
  const buf = Buffer.from(new Float32Array(embedding).buffer);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buf);
}

async function readEmbedding(filePath) {
  const buf = await fs.readFile(filePath);
  return Array.from(
    new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4),
  );
}

// Simple chunker: split by paragraphs, clamp to ~500 words per chunk
function chunkContent(text, maxWords = 500) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

export default function semanticSearchPlugin(context, options) {
  const { siteDir } = context;

  return {
    name: "docusaurus-plugin-semantic-search",

    async loadContent(): Promise<LoadedContent> {
      const { include } = options;

      const docsDir = "recipes";
      // tslint:disable-next-line: no-if-statement
      if (!fs.existsSync(docsDir)) {
        return null;
      }

      // Metadata for default/ master docs files.
      const docsFiles = glob.sync(`**/*.md`, { cwd: docsDir });
      const docsPromises = docsFiles.map(async (source) =>
        processMetadata({
          context,
          options,
          refDir: docsDir,
          source,
        }),
      );

      const metadata = await Promise.all([...docsPromises]);
      return { metadata };
    },

    async contentLoaded({ content, actions }) {
      const { createData } = actions;

      // Grab blog posts already processed by plugin-content-blog
      const { metadata } = content;
      if (metadata.length < 1) return;

      const cacheDir = path.join(
        context.generatedFilesDir,
        "semantic-search-cache",
      );
      await fs.mkdir(cacheDir, { recursive: true });

      const model = await use.load();

      const entries = [];

      for (const post of metadata) {
        const { permalink, title, description, plaintext } = post;
        const chunks = chunkContent(plaintext);

        for (const chunk of chunks) {
          const key = sha256(chunk);
          const cacheFile = path.join(cacheDir, `${key}.bin`);

          let embedding;
          try {
            embedding = await readEmbedding(cacheFile);
          } catch {
            const embTensor = await model.embed([chunk]);
            const embArray = await embTensor.array();
            embedding = embArray[0];
            await writeEmbedding(cacheFile, embedding);
          }

          entries.push({
            url: permalink,
            title,
            description,
            chunk,
            embedding,
          });
        }
      }

      // Write the final index into static assets
      await createData("search-index.json", JSON.stringify(entries, null, 2));
    },
  };
}
