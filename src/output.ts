/**
 * Styled terminal output using chalk.
 * All commands support --json for structured output.
 */

import chalk from "chalk";
import type { ContextNode } from "./node.js";

export function styledNodeId(id: string): string {
  return chalk.cyan(id);
}

export function styledTitle(title: string): string {
  return chalk.bold(title);
}

export function styledDim(text: string): string {
  return chalk.dim(text);
}

export function styledTags(tags: string[]): string {
  return chalk.dim(tags.map((t) => `#${t}`).join(" "));
}

export function echoError(msg: string): void {
  process.stderr.write(chalk.red(`Error: ${msg}\n`));
}

export function echoSuccess(msg: string): void {
  console.log(chalk.green(msg));
}

export function echoWarning(msg: string): void {
  console.log(chalk.yellow(msg));
}

export function formatNodeHeader(node: ContextNode): string {
  const lines: string[] = [];
  lines.push(`${styledNodeId(node.id)}  ${styledTitle(node.title)}`);
  lines.push(styledDim(`Owner: ${node.owner}  Updated: ${node.updated}`));
  if (node.tags.length > 0) lines.push(styledTags(node.tags));
  if (node.refs.length > 0) {
    lines.push("");
    lines.push(styledDim("Code refs:"));
    for (const ref of node.refs) {
      lines.push(`  ${chalk.white(ref.path)} → ${chalk.yellow(ref.symbol)}`);
    }
  }
  if (node.relates_to.length > 0) {
    lines.push("");
    lines.push(styledDim("Related:"));
    for (const rel of node.relates_to) {
      lines.push(`  ${styledNodeId(rel.id)} ${styledDim(`(${rel.type})`)}`);
    }
  }
  return lines.join("\n");
}

export function formatNodeFull(node: ContextNode): string {
  return `${formatNodeHeader(node)}\n\n${node.body}`;
}

export interface DriftResult {
  nodeId: string;
  nodeTitle: string;
  ref: { path: string; symbol: string };
  reason: string;
}

export function formatDriftReport(hits: DriftResult[]): string {
  if (hits.length === 0) return chalk.green("No drift detected.");

  const byNode = new Map<string, DriftResult[]>();
  for (const hit of hits) {
    const list = byNode.get(hit.nodeId) ?? [];
    list.push(hit);
    byNode.set(hit.nodeId, list);
  }

  const lines: string[] = [];
  lines.push(
    chalk.red(
      `${hits.length} drift${hits.length === 1 ? "" : "s"} detected:\n`,
    ),
  );

  for (const [nodeId, nodeHits] of byNode) {
    lines.push(
      `${styledNodeId(nodeId)}  ${styledTitle(nodeHits[0].nodeTitle)}`,
    );
    for (const hit of nodeHits) {
      lines.push(
        `  ${chalk.white(hit.ref.path)} → ${chalk.yellow(hit.ref.symbol)}`,
      );
      lines.push(`  ${styledDim(hit.reason)}`);
    }
    lines.push("");
  }

  lines.push(styledDim("Next steps:"));
  lines.push(styledDim("  docdrift show <node-id>   Review the context"));
  lines.push(styledDim("  docdrift ack <node-id>    Mark as still accurate"));
  lines.push(styledDim("  docdrift edit <node-id>   Update the documentation"));

  return lines.join("\n");
}

export function formatCiAnnotations(hits: DriftResult[]): string {
  return hits
    .map(
      (h) =>
        `::warning file=${h.ref.path},title=Context drift: ${h.nodeId}::${h.ref.symbol} has changed since context was last reviewed`,
    )
    .join("\n");
}

/** Output JSON or formatted text based on --json flag */
export function output(data: unknown, formatted: string, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(formatted);
  }
}
