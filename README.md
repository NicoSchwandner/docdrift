# docdrift

Link business decisions to source code. Detect when code drifts from documentation.

```bash
npx docdrift init
npx docdrift create
npx docdrift lookup src/services/OrderService.ts
npx docdrift check
```

## What It Does

docdrift creates bidirectional links between documentation and source code at the **method level**. When tracked code changes, docdrift detects it — so your documentation never silently goes stale.

## How It Works

1. **Write context nodes** — markdown files in `docs/` with YAML frontmatter linking to specific methods
2. **Pin baselines** — tree-sitter AST parsing hashes each tracked method body
3. **Detect drift** — when a method body changes, docdrift flags which documentation needs review

## Quick Start

```bash
# Initialize in your repo
npx docdrift init

# Create a context node linking docs to code
npx docdrift create

# Record baselines
npx docdrift pin

# Check for drift after code changes
npx docdrift check
```

## Commands

```
docdrift                     Check for drift (default action)
docdrift check               Explicit check (same as bare docdrift)
docdrift check --ci          GitHub Actions annotations
docdrift check --json        Structured output

docdrift init                Initialize docdrift in your repo
docdrift init --nodes-dir <path>  Use a custom directory for context nodes

docdrift create              Create a new context node interactively
docdrift edit <node-id>      Open a context node in your editor

docdrift lookup <path>       Find context nodes linked to a source file
docdrift show <node-id>      Display full context node content

docdrift pin                 Record current code state as baseline
docdrift pin --node <id>     Pin a single node
docdrift ack <node-id>       Mark drift as reviewed (docs still accurate)
```

## Directory Layout

After `docdrift init`:

```
my-repo/
├── .context/
│   ├── config.json       # Repo settings
│   ├── verified.json     # Baseline hashes (committed)
│   └── index.json        # Auto-generated (gitignored)
├── docs/
│   └── billing/
│       └── vat-calculation.md   # Context nodes live here
└── src/
```

Context nodes default to `docs/`. Use `--nodes-dir` to change this (e.g., `docdrift init --nodes-dir .context/nodes`).

## Context Node Format

```yaml
---
id: billing/vat-calculation
title: "VAT Calculation Rules"
owner: team/billing
created: 2026-03-30
updated: 2026-03-30
tags: [billing, vat]
refs:
  - path: src/services/BillingService.ts
    symbol: "calculateVAT(invoice: Invoice)"
relates_to: []
---
## Why This Works This Way

The VAT calculation follows EU regulations for B2B invoicing...
```

## Language Support

C#, TypeScript/JavaScript, Python, Go, Java, Rust — powered by tree-sitter WASM grammars. Auto-detected from file extensions.

## AI Integration

`docdrift init` generates rules for Claude Code, Cursor, and GitHub Copilot so AI assistants automatically check context before modifying tracked code.

## CI Integration

```yaml
- name: Check for documentation drift
  run: npx docdrift check --ci
```

Exits non-zero on drift, with GitHub Actions annotations for inline PR comments.

## License

MIT
