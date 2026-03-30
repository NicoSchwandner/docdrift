# docdrift

CLI tool that links business decision documentation to source code at the method level and detects drift when code changes.

**npm:** `npx docdrift`
**Repo:** https://github.com/NicoSchwandner/docdrift

## Tech Stack

- TypeScript (ESM), Node.js 18+
- yargs (CLI routing + tab completion)
- @clack/prompts (interactive flows)
- web-tree-sitter (WASM, multi-language AST parsing)
- chalk (terminal styling)
- vitest (testing)

## Project Structure

```
src/
├── cli.ts              # Entry point, yargs command registration
├── node.ts             # Parse markdown frontmatter + body
├── index.ts            # Build/load .context/index.json, staleness detection
├── ast.ts              # Tree-sitter WASM: extract symbols, hash method bodies
├── drift.ts            # Compare live hashes against verified baselines
├── output.ts           # Styled terminal output, --json support
└── commands/
    ├── init.ts         # Scaffold .context/, generate AI rules
    ├── lookup.ts       # Find nodes by file path
    ├── show.ts         # Display full node content
    ├── check.ts        # Drift detection (also bare `docdrift`)
    ├── pin.ts          # Record baseline hashes
    ├── ack.ts          # Mark drift as reviewed
    ├── create.ts       # Interactive node creation
    └── edit.ts         # Open in $EDITOR, validate after
```

## Commands

```
docdrift                     # bare = check for drift (default)
docdrift check [--ci] [--all] [--json]
docdrift init
docdrift create
docdrift edit <node-id>
docdrift lookup <path> [--json]
docdrift show <node-id> [--raw] [--json]
docdrift pin [--node <id>] [--force]
docdrift ack <node-id>
docdrift completion          # generate shell completion script
```

## How It Works

1. Context nodes (`.context/nodes/**/*.md`) link documentation to methods via `refs` in YAML frontmatter
2. `pin` hashes tracked method bodies with tree-sitter and stores baselines in `.context/verified.json`
3. `check` re-parses methods live, compares hashes — flags mismatches as drift
4. `ack` updates the baseline after reviewing drift

## Context Node Format

```yaml
---
id: domain/node-name
title: "Human-Readable Title"
owner: team/team-name
created: 2026-03-30
updated: 2026-03-30
tags: [tag1, tag2]
refs:
  - path: src/services/MyService.ts
    symbol: "methodName(param: Type)"
relates_to:
  - id: domain/other-node
    type: depends-on
---
[Prose explaining the business decision]
```

## Directory Layout (in target repos)

After `docdrift init`:

```
.context/
├── config.json          # repo name, language settings
├── index.json           # auto-generated (gitignored)
├── verified.json        # baseline hashes (committed)
└── nodes/               # context node markdown files
```

## Building and Testing

```bash
npm install
npm run build            # tsc
npm test                 # vitest
npm run dev              # tsx src/cli.ts (run without building)
```

## Publishing

GitHub release → `.github/workflows/publish.yml` → npm publish via OIDC trusted publisher. No manual npm publish needed.

## PoC Origin

Rewrite of a Python PoC at `/Users/nico/code/work/ExplorationDays_ContextGraph_NicoSchwandner/`. Key differences: repo-local (`.context/` in each repo, no cross-repo), WASM tree-sitter (no native compilation), simplified commands (`check`/`pin`/`ack` instead of `drift`/`set-baseline`/`reviewed`).

## Supported Languages

C#, TypeScript/JavaScript, Python, Go, Java, Rust — auto-detected from file extensions.
