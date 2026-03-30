/**
 * docdrift create — interactive context node creation with symbol search.
 */

import { mkdir, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { findContextDir } from "../index.js";
import { loadConfig, resolveNodesDir } from "../config.js";
import { listDeclarations, getSupportedExtensions } from "../ast.js";
import { echoError, echoSuccess, styledDim } from "../output.js";

async function collectSourceFiles(
  rootDir: string,
  extensions: Set<string>,
): Promise<string[]> {
  const files: string[] = [];
  const dirs = ["src", "lib", "app", "cmd", "pkg", "internal"];

  for (const dir of dirs) {
    const fullDir = path.join(rootDir, dir);
    try {
      const entries = await readdir(fullDir, { recursive: true });
      for (const entry of entries) {
        const ext = path.extname(String(entry));
        if (extensions.has(ext)) {
          files.push(path.join(dir, String(entry)));
        }
      }
    } catch {
      // directory doesn't exist
    }
  }
  return files.sort();
}

export async function runCreate(): Promise<number> {
  const contextDir = findContextDir();
  if (!contextDir) {
    echoError("Not a docdrift project. Run 'docdrift init' first.");
    return 2;
  }

  const repoRoot = path.dirname(contextDir);

  p.intro("Create a new context node");

  const title = await p.text({
    message: "Title",
    placeholder: "Human-readable title for this context node",
    validate: (v) => (!v || v.length === 0 ? "Title is required" : undefined),
  });
  if (p.isCancel(title)) return 0;

  const idPath = await p.text({
    message: "ID path (domain/name)",
    placeholder: "billing/vat-calculation",
    validate: (v) =>
      v && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(v)
        ? undefined
        : "Must be domain/name (lowercase, hyphens)",
  });
  if (p.isCancel(idPath)) return 0;

  const owner = await p.text({
    message: "Owner",
    placeholder: "team/team-name",
    validate: (v) =>
      v && /^(team|person)\/[a-z0-9-]+$/.test(v)
        ? undefined
        : "Must be team/name or person/name",
  });
  if (p.isCancel(owner)) return 0;

  const tagsInput = await p.text({
    message: "Tags (comma-separated)",
    placeholder: "billing, vat, tax",
    defaultValue: "",
  });
  if (p.isCancel(tagsInput)) return 0;
  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Symbol search
  const addRefs = await p.confirm({
    message: "Link to code symbols?",
    initialValue: true,
  });
  if (p.isCancel(addRefs)) return 0;

  const refs: Array<{ path: string; symbol: string }> = [];

  if (addRefs) {
    const sourceFiles = await collectSourceFiles(
      repoRoot,
      getSupportedExtensions(),
    );

    if (sourceFiles.length === 0) {
      p.log.warn("No source files found in src/, lib/, app/ directories.");
    } else {
      let addMore = true;
      while (addMore) {
        const selectedFile = await p.select({
          message: "Select a source file",
          options: sourceFiles.map((f) => ({ value: f, label: f })),
        });
        if (p.isCancel(selectedFile)) break;

        const spinner = p.spinner();
        spinner.start("Parsing declarations...");
        const declarations = await listDeclarations(
          path.join(repoRoot, selectedFile),
        );
        spinner.stop(`Found ${declarations.length} declaration(s)`);

        if (declarations.length === 0) {
          p.log.warn("No declarations found in this file.");
        } else {
          const selectedSymbols = await p.multiselect({
            message: "Select symbols to link",
            options: declarations.map((d) => ({
              value: d.signature,
              label: `${d.signature} (L${d.startLine}-${d.endLine})`,
            })),
            required: false,
          });
          if (!p.isCancel(selectedSymbols)) {
            for (const sym of selectedSymbols) {
              refs.push({ path: selectedFile, symbol: sym });
            }
          }
        }

        const more = await p.confirm({
          message: "Add refs from another file?",
          initialValue: false,
        });
        if (p.isCancel(more) || !more) addMore = false;
      }
    }
  }

  // Generate frontmatter
  const today = new Date().toISOString().split("T")[0];
  const refsYaml =
    refs.length > 0
      ? `refs:\n${refs.map((r) => `  - path: ${r.path}\n    symbol: "${r.symbol}"`).join("\n")}\n`
      : "";
  const tagsYaml =
    tags.length > 0 ? `tags: [${tags.join(", ")}]\n` : "tags: []\n";

  const content = `---
id: ${idPath}
title: "${title}"
owner: ${owner}
created: ${today}
updated: ${today}
${tagsYaml}${refsYaml}relates_to: []
---
## Why This Works This Way

[Explain the business decision or rationale here...]
`;

  // Write file
  const config = await loadConfig(contextDir);
  const nodesDir = resolveNodesDir(contextDir, config);
  const [domain] = (idPath as string).split("/");
  const nodeDir = path.join(nodesDir, domain);
  await mkdir(nodeDir, { recursive: true });

  const fileName = (idPath as string).split("/").slice(1).join("-") + ".md";
  const filePath = path.join(nodeDir, fileName);
  await writeFile(filePath, content);

  echoSuccess(`Created ${filePath}`);
  console.log("");
  console.log(styledDim("Next steps:"));
  console.log(styledDim(`  $EDITOR ${filePath}    Write the context prose`));
  console.log(
    styledDim(`  docdrift pin --node ${idPath}  Record the baseline`),
  );

  p.outro("Done!");
  return 0;
}
