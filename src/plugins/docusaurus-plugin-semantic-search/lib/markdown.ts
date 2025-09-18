import {unified, type Processor, type CompilerFunction} from 'unified'
import remarkParse from 'remark-parse'
import type {Root, Heading, Text, PhrasingContent, Content} from 'mdast'

/**
 * Unified plugin that sets the processor's compiler to return
 * the text content of the first top-level heading (`# ...`).
 */
export default function remarkFirstHeading(this: Processor) {
  const self = this as Processor

  self.compiler = compiler as CompilerFunction<Root, string | undefined>

  function compiler(tree: Root): string | undefined {
    for (const node of tree.children) {
      if (node.type === 'heading' && node.depth === 1) {
        return flattenText(node.children)
      }
    }
    return undefined
  }
}

/**
 * Convert inline phrasing content into a plain string,
 * stripping formatting markers.
 */
function flattenText(nodes: PhrasingContent[]): string {
  let result = ''

  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        result += (node as Text).value
        break
      case 'emphasis':
      case 'strong':
      case 'delete':
      case 'link':
      case 'linkReference':
        result += flattenText(node.children)
        break
      case 'inlineCode':
        result += node.value
        break
      default:
        // ignore things like images, html, etc.
        break
    }
  }

  return result
}

export async function extractFirstHeading(markdown: string): Promise<string | undefined> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkFirstHeading)
    .process(markdown)

  // `String(file)` would stringify `undefined` to "undefined",
  // so instead access the compiler result directly
  return file.value as string | undefined
}

/**
 * Unified plugin that sets the processor's compiler to return
 * semantic text chunks (string[]) split at logical AST boundaries.
 */
export default function remarkChunker(this: Processor) {
  const self = this as Processor
  self.compiler = compiler as CompilerFunction<Root, string[]>

  function compiler(tree: Root): string[] {
    const chunks: string[] = []
    let buffer: string[] = []

    const flush = () => {
      if (buffer.length > 0) {
        chunks.push(buffer.join(' ').trim())
        buffer = []
      }
    }

    for (const node of tree.children) {
      let text = nodeToText(node)

      if (text) {
        buffer.push(text)

        // Heuristic: if buffer is getting "big enough", flush a chunk
        if (buffer.join(' ').length > 400) {
          flush()
        }
      } else {
        // Non-text node or explicit break point: flush current buffer
        flush()
      }
    }

    // Final flush
    flush()

    return chunks.filter(Boolean)
  }
}

/**
 * Convert block-level node into a plain text string.
 */
function nodeToText(node: Content): string | undefined {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return flattenText(node.children)
    case 'blockquote':
      return (node as Blockquote).children.map(nodeToText).filter(Boolean).join(' ')
    case 'list':
      return (node as List).children
        .map((item) =>
          item.children.map(nodeToText).filter(Boolean).join(' ')
        )
        .filter(Boolean)
        .join(' ')
    case 'code':
      return (node as Code).value
    default:
      return undefined
  }
}

// Example usage:
export async function chunkMarkdown(markdown: string): Promise<string[]> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkChunker)
    .process(markdown)

  return file.result as string[]
}
