/**
 * Drift detection — compares live tree-sitter content hashes
 * against stored baselines in .context/verified.json.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { findSymbolInFile, findSymbolInSource } from "./ast.js";
import type { ContextNode } from "./node.js";
import type { DriftResult } from "./output.js";

export interface VerifiedRef {
  content_hash: string;
  verified_at: string;
  verified_date: string;
}

export type VerifiedCache = Record<string, Record<string, VerifiedRef>>;

function refKey(ref: { path: string; symbol: string }): string {
  return `${ref.path}:${ref.symbol}`;
}

export async function loadVerified(contextDir: string): Promise<VerifiedCache> {
  try {
    const raw = await readFile(path.join(contextDir, "verified.json"), "utf-8");
    return JSON.parse(raw) as VerifiedCache;
  } catch {
    return {};
  }
}

export async function saveVerified(
  contextDir: string,
  cache: VerifiedCache,
): Promise<void> {
  await writeFile(
    path.join(contextDir, "verified.json"),
    JSON.stringify(cache, null, 2) + "\n",
  );
}

export async function checkDrift(
  nodes: ContextNode[],
  verified: VerifiedCache,
  repoRoot: string,
): Promise<DriftResult[]> {
  const hits: DriftResult[] = [];

  for (const node of nodes) {
    const nodeVerified = verified[node.id];
    if (!nodeVerified) continue; // not pinned yet

    for (const ref of node.refs) {
      const key = refKey(ref);
      const baseline = nodeVerified[key];
      if (!baseline) continue; // this ref not pinned

      const filePath = path.join(repoRoot, ref.path);
      let result;
      try {
        result = await findSymbolInFile(filePath, ref.symbol);
      } catch {
        hits.push({
          nodeId: node.id,
          nodeTitle: node.title,
          ref,
          reason: `File not found: ${ref.path}`,
        });
        continue;
      }

      if (!result) {
        hits.push({
          nodeId: node.id,
          nodeTitle: node.title,
          ref,
          reason: "Symbol not found (renamed or removed)",
        });
        continue;
      }

      if (result.contentHash !== baseline.content_hash) {
        hits.push({
          nodeId: node.id,
          nodeTitle: node.title,
          ref,
          reason: "Content changed since last review",
        });
      }
    }
  }

  return hits;
}

export async function pinNode(
  node: ContextNode,
  verified: VerifiedCache,
  repoRoot: string,
  force: boolean,
): Promise<{ pinned: number; skipped: number }> {
  let pinned = 0;
  let skipped = 0;

  if (!verified[node.id]) verified[node.id] = {};

  for (const ref of node.refs) {
    const key = refKey(ref);

    if (verified[node.id][key] && !force) {
      skipped++;
      continue;
    }

    const filePath = path.join(repoRoot, ref.path);
    let result;
    try {
      result = await findSymbolInFile(filePath, ref.symbol);
    } catch {
      skipped++;
      continue;
    }

    if (result) {
      verified[node.id][key] = {
        content_hash: result.contentHash,
        verified_at: "working-tree",
        verified_date: new Date().toISOString(),
      };
      pinned++;
    } else {
      skipped++;
    }
  }

  return { pinned, skipped };
}

export async function pinAll(
  nodes: ContextNode[],
  verified: VerifiedCache,
  repoRoot: string,
  force: boolean,
): Promise<{ pinned: number; skipped: number }> {
  let totalPinned = 0;
  let totalSkipped = 0;

  for (const node of nodes) {
    const { pinned, skipped } = await pinNode(node, verified, repoRoot, force);
    totalPinned += pinned;
    totalSkipped += skipped;
  }

  return { pinned: totalPinned, skipped: totalSkipped };
}

export async function ackNode(
  node: ContextNode,
  verified: VerifiedCache,
  repoRoot: string,
): Promise<number> {
  if (!verified[node.id]) verified[node.id] = {};
  let acked = 0;

  for (const ref of node.refs) {
    const key = refKey(ref);
    const filePath = path.join(repoRoot, ref.path);
    const result = await findSymbolInFile(filePath, ref.symbol);

    if (result) {
      verified[node.id][key] = {
        content_hash: result.contentHash,
        verified_at: "working-tree",
        verified_date: new Date().toISOString(),
      };
      acked++;
    }
  }

  return acked;
}
