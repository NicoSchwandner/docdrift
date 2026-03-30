/**
 * docdrift lookup <path> — find context nodes linked to a source file.
 */

import { ensureIndex, findContextDir } from "../index.js";
import { styledNodeId, styledDim, echoError, output } from "../output.js";
import chalk from "chalk";

export async function runLookup(
  filePath: string,
  json: boolean,
): Promise<number> {
  const contextDir = findContextDir();
  if (!contextDir) {
    echoError("Not a docdrift project. Run 'docdrift init' first.");
    return 2;
  }

  const index = await ensureIndex(contextDir);
  const entries = index.by_path[filePath];

  if (!entries || entries.length === 0) {
    if (json) {
      console.log(JSON.stringify({ path: filePath, nodes: [] }));
    } else {
      console.log(styledDim(`No context nodes linked to ${filePath}`));
    }
    return 1;
  }

  const data = {
    path: filePath,
    nodes: entries.map((e) => {
      const node = index.nodes.find((n) => n.id === e.node);
      return { id: e.node, title: node?.title ?? "", symbol: e.symbol };
    }),
  };

  const formatted = data.nodes
    .map(
      (n) =>
        `${styledNodeId(n.id)}  ${chalk.bold(n.title)}\n  → ${chalk.yellow(n.symbol)}`,
    )
    .join("\n\n");

  output(data, formatted, json);
  return 0;
}
