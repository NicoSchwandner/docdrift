/**
 * docdrift ack <node-id> — acknowledge drift, update baseline to current state.
 */

import path from "node:path";
import { ensureIndex, findContextDir } from "../index.js";
import { loadVerified, saveVerified, ackNode } from "../drift.js";
import { echoError, echoSuccess } from "../output.js";

export async function runAck(nodeId: string): Promise<number> {
  const contextDir = findContextDir();
  if (!contextDir) {
    echoError("Not a docdrift project. Run 'docdrift init' first.");
    return 2;
  }

  const repoRoot = path.dirname(contextDir);
  const index = await ensureIndex(contextDir);
  const node = index.nodes.find((n) => n.id === nodeId);

  if (!node) {
    echoError(`Node '${nodeId}' not found.`);
    return 1;
  }

  const verified = await loadVerified(contextDir);
  const acked = await ackNode(node, verified, repoRoot);
  await saveVerified(contextDir, verified);

  echoSuccess(`Acknowledged ${acked} ref(s) for ${nodeId}. Baseline updated.`);
  return 0;
}
