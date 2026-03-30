// Index builder — compiles all context node markdown files into index.json
// with secondary indices (by_path, by_tag). Uses git tree hash for O(1) staleness detection.

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { statSync as statSyncFs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { loadNode, type ContextNode } from "./node.js";
import { loadConfig, resolveNodesDir, nodesFilePrefix } from "./config.js";

const exec = promisify(execFile);

export interface PathEntry {
  node: string;
  symbol: string;
}

export interface Index {
  version: number;
  built_at: string;
  tree_hash: string;
  nodes: ContextNode[];
  by_path: Record<string, PathEntry[]>;
  by_tag: Record<string, string[]>;
}

const EDGE_REVERSE: Record<string, string> = {
  "child-of": "parent-of",
  "parent-of": "child-of",
  implements: "implemented-by",
  "implemented-by": "implements",
  "depends-on": "depended-on-by",
  "depended-on-by": "depends-on",
  "justified-by": "justifies",
  justifies: "justified-by",
  supersedes: "superseded-by",
  "superseded-by": "supersedes",
  overrides: "overridden-by",
  "overridden-by": "overrides",
  related: "related",
};

export function reverseEdgeType(type: string): string {
  return EDGE_REVERSE[type] ?? `inverse-${type}`;
}

async function getTreeHash(nodesDir: string): Promise<string | null> {
  try {
    const { stdout } = await exec(
      "git",
      ["rev-parse", `HEAD:${path.relative(process.cwd(), nodesDir)}`],
      {
        cwd: process.cwd(),
      },
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

async function collectNodeFiles(
  nodesDir: string,
  prefix = "",
): Promise<string[]> {
  const entries = await readdir(nodesDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(
        ...(await collectNodeFiles(path.join(nodesDir, entry.name), rel)),
      );
    } else if (entry.name.endsWith(".md")) {
      files.push(rel);
    }
  }
  return files;
}

export async function buildIndex(contextDir: string): Promise<Index> {
  const config = await loadConfig(contextDir);
  const nodesDir = resolveNodesDir(contextDir, config);
  const filePrefix = nodesFilePrefix(config);
  const files = await collectNodeFiles(nodesDir);
  const treeHash = (await getTreeHash(nodesDir)) ?? "";

  const nodes: ContextNode[] = [];
  const byPath: Record<string, PathEntry[]> = {};
  const byTag: Record<string, string[]> = {};

  for (const file of files) {
    const node = await loadNode(
      path.join(nodesDir, file),
      `${filePrefix}/${file}`,
    );
    nodes.push(node);

    for (const ref of node.refs) {
      const entries = byPath[ref.path] ?? [];
      entries.push({ node: node.id, symbol: ref.symbol });
      byPath[ref.path] = entries;
    }

    for (const tag of node.tags) {
      const ids = byTag[tag] ?? [];
      ids.push(node.id);
      byTag[tag] = ids;
    }
  }

  return {
    version: 1,
    built_at: new Date().toISOString(),
    tree_hash: treeHash,
    nodes,
    by_path: byPath,
    by_tag: byTag,
  };
}

export async function writeIndex(
  contextDir: string,
  index: Index,
): Promise<void> {
  await writeFile(
    path.join(contextDir, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
  );
}

export async function isIndexStale(contextDir: string): Promise<boolean> {
  const indexPath = path.join(contextDir, "index.json");
  try {
    await stat(indexPath);
  } catch {
    return true; // index doesn't exist
  }

  try {
    const raw = await readFile(indexPath, "utf-8");
    const existing = JSON.parse(raw) as Index;
    const config = await loadConfig(contextDir);
    const nodesDir = resolveNodesDir(contextDir, config);
    const currentHash = await getTreeHash(nodesDir);

    // If we can't get tree hash, fall back to assuming stale
    if (!currentHash) return true;
    return existing.tree_hash !== currentHash;
  } catch {
    return true;
  }
}

export async function ensureIndex(contextDir: string): Promise<Index> {
  if (await isIndexStale(contextDir)) {
    const index = await buildIndex(contextDir);
    try {
      await writeIndex(contextDir, index);
    } catch {
      // Read-only filesystem — use in-memory index
    }
    return index;
  }
  const raw = await readFile(path.join(contextDir, "index.json"), "utf-8");
  return JSON.parse(raw) as Index;
}

export function findContextDir(): string | null {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, ".context");
    try {
      if (statSyncFs(candidate).isDirectory()) return candidate;
    } catch {
      // not found, keep walking up
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
