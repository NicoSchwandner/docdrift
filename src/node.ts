// Context node parser — reads context node markdown files,
// extracts YAML frontmatter and markdown body.

import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

export interface CodeRef {
  path: string;
  symbol: string;
}

export interface Relation {
  id: string;
  type: string;
}

export interface ContextNode {
  id: string;
  title: string;
  owner: string;
  created: string;
  updated: string;
  tags: string[];
  refs: CodeRef[];
  relates_to: Relation[];
  body: string;
  /** Relative path to the .md file from .context/ */
  file: string;
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

export function parseFrontmatter(content: string): {
  meta: Record<string, unknown>;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) throw new Error("Invalid context node: missing YAML frontmatter");
  return {
    meta: parseYaml(match[1]) as Record<string, unknown>,
    body: match[2].trim(),
  };
}

export function parseNode(content: string, file: string): ContextNode {
  const { meta, body } = parseFrontmatter(content);

  const id = meta.id as string;
  if (!id) throw new Error(`Node in ${file} is missing required field 'id'`);
  if (!meta.title)
    throw new Error(`Node ${id} is missing required field 'title'`);
  if (!meta.owner)
    throw new Error(`Node ${id} is missing required field 'owner'`);

  return {
    id,
    title: meta.title as string,
    owner: meta.owner as string,
    created: String(meta.created ?? ""),
    updated: String(meta.updated ?? ""),
    tags: (meta.tags as string[]) ?? [],
    refs: ((meta.refs as CodeRef[]) ?? []).map((r) => ({
      path: r.path,
      symbol: r.symbol,
    })),
    relates_to: ((meta.relates_to as Relation[]) ?? []).map((r) => ({
      id: r.id,
      type: r.type,
    })),
    body,
    file,
  };
}

export async function loadNode(
  filePath: string,
  relativeFile: string,
): Promise<ContextNode> {
  const content = await readFile(filePath, "utf-8");
  return parseNode(content, relativeFile);
}
