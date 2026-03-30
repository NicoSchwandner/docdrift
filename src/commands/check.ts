/**
 * docdrift check — compare live hashes against baselines.
 * Also the default action for bare `docdrift`.
 */

import path from "node:path";
import { ensureIndex, findContextDir } from "../index.js";
import { checkDrift, loadVerified } from "../drift.js";
import {
  formatDriftReport,
  formatCiAnnotations,
  echoError,
  output,
  type DriftResult,
} from "../output.js";

export async function runCheck(opts: {
  ci?: boolean;
  all?: boolean;
  json?: boolean;
}): Promise<number> {
  const contextDir = findContextDir();
  if (!contextDir) {
    echoError("Not a docdrift project. Run 'docdrift init' first.");
    return 2;
  }

  const repoRoot = path.dirname(contextDir);
  const index = await ensureIndex(contextDir);
  const verified = await loadVerified(contextDir);

  const hits = await checkDrift(index.nodes, verified, repoRoot);

  if (opts.ci) {
    if (hits.length > 0) console.log(formatCiAnnotations(hits));
    return hits.length > 0 ? 1 : 0;
  }

  const data = {
    drift: hits.length > 0,
    count: hits.length,
    hits: hits.map((h) => ({
      nodeId: h.nodeId,
      nodeTitle: h.nodeTitle,
      path: h.ref.path,
      symbol: h.ref.symbol,
      reason: h.reason,
    })),
  };

  output(data, formatDriftReport(hits), opts.json ?? false);
  return hits.length > 0 ? 1 : 0;
}
