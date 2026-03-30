# ctxgraph

Link business decisions to source code. Detect when code drifts from documentation.

```bash
npx ctxgraph init
npx ctxgraph lookup src/services/OrderService.ts
npx ctxgraph drift
```

## What It Does

ctxgraph is a CLI tool that creates bidirectional links between documentation and source code at the **method level**. When tracked code changes, ctxgraph detects it — so your documentation never silently goes stale.

## How It Works

1. **Write context nodes** — markdown files with YAML frontmatter linking to specific methods
2. **Track baselines** — tree-sitter AST parsing hashes each tracked method body
3. **Detect drift** — when a method body changes, ctxgraph flags which documentation needs review

## Quick Start

```bash
# Initialize in your repo
npx ctxgraph init

# Create a context node linking docs to code
npx ctxgraph create

# Check for drift after code changes
npx ctxgraph drift
```

## Language Support

C#, TypeScript/JavaScript, Python, Go, Java, Rust — powered by tree-sitter WASM grammars.

## AI Integration

`ctxgraph init` generates rules for Claude Code, Cursor, and Copilot so AI assistants automatically check context before modifying tracked code.

## Status

Under development. Rewrite of [ExplorationDays_ContextGraph](https://github.com/WintDev/ExplorationDays_ContextGraph_NicoSchwandner) PoC.
