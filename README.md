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

1. **Write context nodes** — markdown files with YAML frontmatter linking to specific methods
2. **Pin baselines** — tree-sitter AST parsing hashes each tracked method body
3. **Detect drift** — when a method body changes, docdrift flags which documentation needs review

## Quick Start

```bash
# Initialize in your repo
npx docdrift init

# Create a context node linking docs to code
npx docdrift create

# Check for drift after code changes
npx docdrift check
```

## Commands

```
docdrift                     Check for drift (default action)
docdrift check               Explicit check (same as bare docdrift)
docdrift check --ci          GitHub Actions annotations

docdrift init                Initialize .context/ in your repo
docdrift create              Create a new context node interactively
docdrift edit <node-id>      Open a context node in your editor

docdrift lookup <path>       Find context nodes linked to a source file
docdrift show <node-id>      Display full context node content

docdrift pin                 Record current code state as baseline
docdrift ack <node-id>       Mark drift as reviewed (docs still accurate)
```

## Language Support

C#, TypeScript/JavaScript, Python, Go, Java, Rust — powered by tree-sitter WASM grammars.

## AI Integration

`docdrift init` generates rules for Claude Code, Cursor, and Copilot so AI assistants automatically check context before modifying tracked code.

## Status

Under development. Rewrite of [ExplorationDays_ContextGraph](https://github.com/WintDev/ExplorationDays_ContextGraph_NicoSchwandner) PoC.
