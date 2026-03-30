/**
 * docdrift edit <node-id> — open a context node in $EDITOR, validate after save.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { ensureIndex, findContextDir } from "../index.js";
import { parseFrontmatter } from "../node.js";
import { echoError, echoSuccess, echoWarning } from "../output.js";

export async function runEdit(nodeId: string): Promise<number> {
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

  const repoRoot = path.dirname(contextDir);
  const filePath = path.join(repoRoot, node.file);
  const editor = process.env.EDITOR || process.env.VISUAL || "vi";

  try {
    execFileSync(editor, [filePath], { stdio: "inherit" });
  } catch {
    echoError(
      `Editor '${editor}' failed. Set $EDITOR to your preferred editor.`,
    );
    return 2;
  }

  // Validate after edit
  try {
    const content = await readFile(filePath, "utf-8");
    const { meta } = parseFrontmatter(content);

    if (!meta.id) echoWarning("Warning: missing 'id' in frontmatter.");
    if (!meta.title) echoWarning("Warning: missing 'title' in frontmatter.");
    if (!meta.owner) echoWarning("Warning: missing 'owner' in frontmatter.");

    if (meta.id && meta.id !== nodeId) {
      echoWarning(`Warning: id changed from '${nodeId}' to '${meta.id}'.`);
    }

    echoSuccess("Node validated successfully.");
  } catch (err) {
    echoWarning(
      `Validation warning: ${err instanceof Error ? err.message : err}`,
    );
  }

  return 0;
}
