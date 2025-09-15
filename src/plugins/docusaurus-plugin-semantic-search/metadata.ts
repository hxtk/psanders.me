import {
  aliasedSitePath,
  normalizeUrl,
  parseMarkdownFile,
} from "@docusaurus/utils";
import fs from "fs-extra";
import path from "path";
import removeMd from "remove-markdown";
import striptags from "striptags";
import { VFile } from "vfile";
import { matter } from "vfile-matter";

export interface MetadataRaw {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly source: string;
  readonly permalink: string;
  readonly version?: string;
  readonly plaintext: string;
}

export default async function processMetadata({
  source,
  refDir,
  context,
}): Promise<MetadataRaw> {
  const { siteDir, baseUrl } = context;

  const dirName = path.dirname(source);
  const filePath = path.join(refDir, source);
  const fileStringPromise = fs.readFile(filePath, "utf-8");

  const contents = await fileStringPromise;
  const plaintext = removeMd(striptags(contents));
  const { frontMatter = {}, excerpt } = parseMarkdownFile({
    filePath,
    fileContent: contents,
    parseFrontMatter: parseFileContentFrontMatter,
  });

  const baseID = frontMatter.id || path.basename(source, path.extname(source));
  // tslint:disable-next-line: no-if-statement
  if (baseID.includes("/")) {
    throw new Error('Document id cannot include "/".');
  }
  // tslint:enable no-if-statement

  // Append subdirectory as part of id.
  const id = dirName !== "." ? `${dirName}/${baseID}` : baseID;

  const title = frontMatter.title || baseID;
  const description = frontMatter.description || excerpt;

  // The last portion of the url path. Eg: 'foo/bar', 'bar'
  const routePath = id;
  const permalink = normalizeUrl([baseUrl, routePath]);

  const metadata: MetadataRaw = {
    description,
    id,
    permalink,
    plaintext,
    source: aliasedSitePath(filePath, siteDir),
    title,
  };

  return metadata;
}

/**
 * Takes a raw Markdown file content, and parses the front matter using
 * vfile-matter.
 */
export function parseFileContentFrontMatter(fileContent: string): {
  /** Front matter as parsed by gray-matter. */
  frontMatter: { [key: string]: unknown };
  /** The remaining content, trimmed. */
  content: string;
} {
  // Wrap the raw content in a VFile
  const file = new VFile({ value: stringToArrayBuffer(fileContent) });

  // Parse the front matter using vfile-matter
  matter(file, { strip: true }); // `strip: true` removes front matter from content

  return {
    frontMatter: file.data.matter || {},
    content: String(file).trim(),
  };
}

function stringToArrayBuffer(str) {
  const encoder = new TextEncoder(); // Defaults to UTF-8
  const uint8Array = encoder.encode(str); // Encodes the string into a Uint8Array
  return uint8Array.buffer; // Returns the underlying ArrayBuffer
}
