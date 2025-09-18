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

