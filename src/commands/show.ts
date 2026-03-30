/**
 * docdrift show <node-id> — display full content of a context node.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ensureIndex, findContextDir } from "../index.js";
import { formatNodeFull, echoError, output } from "../output.js";

export async function runShow(
  nodeId: string,
  raw: boolean,
  json: boolean,
): Promise<number> {
  const contextDir = findContextDir();
  if (!contextDir) {
    echoError("Not a docdrift project. Run 'docdrift init' first.");
    return 2;
  }

  const index = await ensureIndex(contextDir);
  const node = index.nodes.find((n) => n.id === nodeId);

  if (!node) {
    echoError(`Node '${nodeId}' not found.`);
    return 1;
  }

  if (raw) {
    const repoRoot = path.dirname(contextDir);
    const content = await readFile(path.join(repoRoot, node.file), "utf-8");
    console.log(content);
    return 0;
  }

  output(node, formatNodeFull(node), json);
  return 0;
}
