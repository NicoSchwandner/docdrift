/**
 * docdrift init — scaffold .context/ directory and generate AI provider rules.
 */

import {
  mkdir,
  writeFile,
  readFile,
  readdir,
  appendFile,
  access,
} from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { styledDim, echoSuccess } from "../output.js";

const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  csharp: [".cs"],
  typescript: [".ts", ".tsx"],
  javascript: [".js", ".jsx"],
  python: [".py"],
  go: [".go"],
  java: [".java"],
  rust: [".rs"],
};

async function detectLanguages(rootDir: string): Promise<string[]> {
  const found = new Set<string>();
  const dirs = ["src", "lib", "app", ".", "cmd", "pkg", "internal"];

  for (const dir of dirs) {
    const fullDir = path.join(rootDir, dir);
    try {
      const entries = await readdir(fullDir, { recursive: true });
      for (const entry of entries) {
        const ext = path.extname(String(entry));
        for (const [lang, exts] of Object.entries(LANGUAGE_EXTENSIONS)) {
          if (exts.includes(ext)) found.add(lang);
        }
      }
    } catch {
      // directory doesn't exist
    }
  }
  return [...found];
}

async function detectRepoName(rootDir: string): Promise<string> {
  // Try package.json
  try {
    const pkg = JSON.parse(
      await readFile(path.join(rootDir, "package.json"), "utf-8"),
    );
    if (pkg.name) return pkg.name;
  } catch {}

  // Try .csproj
  try {
    const entries = await readdir(rootDir);
    const csproj = entries.find((e) => e.endsWith(".csproj"));
    if (csproj) return csproj.replace(".csproj", "");
  } catch {}

  // Fallback to directory name
  return path.basename(rootDir);
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const CLAUDE_RULE = (repoName: string) => `# Context-Aware Development

This repository uses [docdrift](https://github.com/NicoSchwandner/docdrift) to link business decisions to source code.

## Before Modifying Code

Run \`npx docdrift lookup <path>\` for **every source file you read or plan to modify**.

\`\`\`bash
npx docdrift lookup <relative-path>
\`\`\`

If context nodes exist, read them with \`npx docdrift show <node-id>\` — they contain business rationale that should inform your changes.

## When Modifying Code

If the requested change contradicts the documented rationale:
- Quote the relevant part of the context node
- Explain that this appears to be an intentional design decision
- Ask the developer to explicitly confirm they want to override it

## After Making Changes

If you modified code tracked by context nodes, offer to update the context:
- Run \`npx docdrift check\` to detect drift
- If drift is detected, ask if the documentation should be updated
- Use \`npx docdrift ack <node-id>\` if docs are still accurate
- Use \`npx docdrift edit <node-id>\` if docs need updating
`;

const CURSOR_RULE = (repoName: string) => `---
description: Context-aware development with docdrift
globs:
alwaysApply: true
---

# Context-Aware Development

This repository uses docdrift to link business decisions to source code.

Before modifying any source file, run:
\`\`\`bash
npx docdrift lookup <relative-path>
\`\`\`

If context nodes exist, read them with \`npx docdrift show <node-id>\`.

If changes contradict documented rationale, surface the conflict before proceeding.

After changes, run \`npx docdrift check\` to detect drift.
`;

const COPILOT_INSTRUCTIONS = `
## Context-Aware Development (docdrift)

This repository uses docdrift to link business decisions to source code.
Before modifying source files, check for context with \`npx docdrift lookup <path>\`.
If context exists, read it with \`npx docdrift show <node-id>\` and respect documented rationale.
After changes, run \`npx docdrift check\` to detect drift.
`;

export async function runInit(opts: { nodesDir?: string } = {}): Promise<void> {
  const rootDir = process.cwd();
  const contextDir = path.join(rootDir, ".context");

  if (await exists(contextDir)) {
    console.log(chalk.yellow(".context/ already exists. Skipping scaffold."));
    return;
  }

  const repoName = await detectRepoName(rootDir);
  const languages = await detectLanguages(rootDir);

  // Resolve nodes directory — default is docs/
  const nodesDirRel = opts.nodesDir ?? "docs";
  const nodesDir = path.join(rootDir, nodesDirRel);

  // Scaffold .context/ and nodes dir
  await mkdir(contextDir, { recursive: true });
  await mkdir(nodesDir, { recursive: true });

  // config.json — only write nodes_dir if non-default
  const config: Record<string, unknown> = {
    name: repoName,
    languages,
    version: 1,
  };
  if (opts.nodesDir) config.nodes_dir = opts.nodesDir;
  await writeFile(
    path.join(contextDir, "config.json"),
    JSON.stringify(config, null, 2) + "\n",
  );

  // verified.json (empty baseline)
  await writeFile(path.join(contextDir, "verified.json"), "{}\n");

  // Add index.json to .gitignore
  const gitignorePath = path.join(rootDir, ".gitignore");
  try {
    const gitignore = await readFile(gitignorePath, "utf-8");
    if (!gitignore.includes(".context/index.json")) {
      await appendFile(
        gitignorePath,
        "\n# docdrift auto-generated index\n.context/index.json\n",
      );
    }
  } catch {
    await writeFile(
      gitignorePath,
      "# docdrift auto-generated index\n.context/index.json\n",
    );
  }

  // Generate AI provider rules
  // Claude
  const claudeDir = path.join(rootDir, ".claude", "rules");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(path.join(claudeDir, "context.md"), CLAUDE_RULE(repoName));

  // Cursor
  const cursorDir = path.join(rootDir, ".cursor", "rules");
  await mkdir(cursorDir, { recursive: true });
  await writeFile(path.join(cursorDir, "context.mdc"), CURSOR_RULE(repoName));

  // Copilot
  const copilotPath = path.join(rootDir, ".github", "copilot-instructions.md");
  if (await exists(copilotPath)) {
    const content = await readFile(copilotPath, "utf-8");
    if (!content.includes("docdrift")) {
      await appendFile(copilotPath, COPILOT_INSTRUCTIONS);
    }
  } else {
    await mkdir(path.join(rootDir, ".github"), { recursive: true });
    await writeFile(copilotPath, COPILOT_INSTRUCTIONS.trim() + "\n");
  }

  const nodesDirLabel = nodesDirRel;
  echoSuccess("Initialized docdrift in .context/");
  console.log("");
  console.log(`  Repo:       ${chalk.white(repoName)}`);
  console.log(
    `  Languages:  ${chalk.white(languages.join(", ") || "none detected")}`,
  );
  console.log(`  Nodes:      ${chalk.white(nodesDirLabel)}`);
  console.log("");
  console.log(styledDim("Next steps:"));
  console.log(styledDim("  docdrift create    Create your first context node"));
  console.log(styledDim("  git add .context/  Commit the context directory"));
}
