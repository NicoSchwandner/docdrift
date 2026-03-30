/**
 * docdrift pin — record current code state as known-good baseline.
 */

import path from "node:path";
import { ensureIndex, findContextDir } from "../index.js";
import { loadVerified, saveVerified, pinAll, pinNode } from "../drift.js";
import { echoError, echoSuccess, styledDim } from "../output.js";

export async function runPin(opts: {
  node?: string;
  force?: boolean;
}): Promise<number> {
  const contextDir = findContextDir();
  if (!contextDir) {
    echoError("Not a docdrift project. Run 'docdrift init' first.");
    return 2;
  }

  const repoRoot = path.dirname(contextDir);
  const index = await ensureIndex(contextDir);
  const verified = await loadVerified(contextDir);

  if (opts.node) {
    const node = index.nodes.find((n) => n.id === opts.node);
    if (!node) {
      echoError(`Node '${opts.node}' not found.`);
      return 1;
    }
    const { pinned, skipped } = await pinNode(
      node,
      verified,
      repoRoot,
      opts.force ?? false,
    );
    await saveVerified(contextDir, verified);
    echoSuccess(`Pinned ${pinned} ref(s) for ${opts.node}.`);
    if (skipped > 0) {
      console.log(
        styledDim(
          `${skipped} skipped (already pinned, use --force to re-pin).`,
        ),
      );
    }
    return 0;
  }

  const { pinned, skipped } = await pinAll(
    index.nodes,
    verified,
    repoRoot,
    opts.force ?? false,
  );
  await saveVerified(contextDir, verified);
  echoSuccess(`Pinned ${pinned} ref(s) across ${index.nodes.length} node(s).`);
  if (skipped > 0) {
    console.log(
      styledDim(`${skipped} skipped (already pinned, use --force to re-pin).`),
    );
  }
  return 0;
}
