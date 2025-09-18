import {
  aliasedSitePath,
  normalizeUrl,
  parseMarkdownFile,
} from "@docusaurus/utils";
import fs from "fs-extra";
import path from "path";
import removeMd from "remove-markdown";
import striptags from "striptags";
import { read } from "to-vfile";
import { VFile } from "vfile";
import { matter } from "vfile-matter";

import {extractFirstHeading} from "./lib/markdown";

export interface MetadataRaw {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly source: string;
  readonly permalink: string;
  readonly version?: string;
  readonly plaintext: string;
}

interface ProcessMetadataOptions {
  source: string;
  refDir: string;
  context: any;
  type: "blog" | "docs";
  basePath: string;
}

export default async function processMetadata({
  source,
  refDir,
  context,
  type,
  basePath,
}: ProcessMetadataOptions): Promise<MetadataRaw> {
  const { siteDir, baseUrl } = context;
  const dirName = path.dirname(source);
  const filePath = path.join(refDir, source);

  const file = await read(filePath);
  matter(file, { strip: true });
  const contents = String(file);
  const frontMatter = file.data?.matter;

  const plaintext = removeMd(striptags(contents));

  const { excerpt } = parseMarkdownFile({
    filePath,
    fileContent: contents,
    parseFrontMatter: parseFileContentFrontMatter,
  });

  const baseID = frontMatter.id || path.basename(source, path.extname(source));
  if (baseID.includes("/")) {
    throw new Error('Document id cannot include "/".');
  }
  const id = dirName !== "." ? `${dirName}/${baseID}` : baseID;

  const contentTitle = await extractFirstHeading(contents);
  const title = frontMatter.title ?? contentTitle;
  const description = frontMatter.description || excerpt;

  let permalink: string;

  if (frontMatter.slug) {
    // Front matter slug overrides everything
    permalink = normalizeUrl([baseUrl, basePath, frontMatter.slug as string]);
  } else {
    // Determine the "name" portion of the URL
    let fileName = path.basename(source, path.extname(source));

    if (fileName === "index") {
      const dirs = path.dirname(source).split(path.sep);
      fileName = dirs[dirs.length - 1] || fileName;
    }

    if (type === "blog") {
      // Check for date prefix in blog filenames
      const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
      if (!dateMatch) {
        permalink = normalizeUrl([baseUrl, basePath, fileName]);
      } else {
        const [, datePart, namePart] = dateMatch;
        const [yyyy, mm, dd] = datePart.split("-");
        permalink = normalizeUrl([baseUrl, basePath, yyyy, mm, dd, namePart]);
      }
    } else {
      const source = path.relative(path.join(siteDir, basePath), filePath);
      permalink = getDocPermalink({ source, baseUrl, basePath });
    }
  }

  return {
    description,
    id,
    permalink,
    plaintext,
    source: aliasedSitePath(filePath, siteDir),
    title,
  };
}

function getDocPermalink({
  source, // file path relative to docs root, e.g. 'guides/setup/index.md'
  baseUrl, // site base URL
  basePath, // docs root path in URL, e.g. 'docs'
}: {
  source: string;
  baseUrl: string;
  basePath: string;
}) {
  const parsed = path.parse(source);

  // Compute the relative path segments
  let segments = parsed.dir ? parsed.dir.split(path.sep) : [];

  // Determine the "file" segment
  let fileName = parsed.name;
  if (fileName === "index") {
    // If index, omit filename (URL is just the folder)
    // segments are already correct
  } else {
    segments.push(fileName);
  }

  // Construct the final URL
  return normalizeUrl([baseUrl, basePath, ...segments]);
}

/**
 * Parses front matter using vfile-matter.
 */
export function parseFileContentFrontMatter(fileContent: string): {
  frontMatter: { [key: string]: unknown };
  content: string;
} {
  // Encode string into a Uint8Array (backed by ArrayBuffer)
  const uint8 = new TextEncoder().encode(fileContent);
  const file = new VFile({ value: uint8 });
  matter(file, { strip: true });

  // Convert the possibly stripped value back to string
  const contentString =
    typeof file.value === "string"
      ? file.value
      : new TextDecoder().decode(file.value);

  return {
    frontMatter: file.data.matter || {},
    content: contentString.trim(),
  };
}
