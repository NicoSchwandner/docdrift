// Load and resolve .context/config.json settings.

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DocdriftConfig {
  name: string;
  languages: string[];
  version: number;
  /** Where context node .md files live, relative to repo root. Default: "docs" */
  nodes_dir?: string;
}

export async function loadConfig(contextDir: string): Promise<DocdriftConfig> {
  const raw = await readFile(path.join(contextDir, "config.json"), "utf-8");
  return JSON.parse(raw) as DocdriftConfig;
}

const DEFAULT_NODES_DIR = "docs";

/** Resolves the absolute path to the nodes directory. */
export function resolveNodesDir(
  contextDir: string,
  config: DocdriftConfig,
): string {
  const repoRoot = path.dirname(contextDir);
  return path.join(repoRoot, config.nodes_dir ?? DEFAULT_NODES_DIR);
}

/** Returns the nodes dir relative to repo root (used in node.file for index entries). */
export function nodesFilePrefix(config: DocdriftConfig): string {
  return config.nodes_dir ?? DEFAULT_NODES_DIR;
}
