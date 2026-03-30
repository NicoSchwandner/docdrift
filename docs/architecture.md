# Architecture

## Design Principles

1. **Repo-local** — context lives next to the code it documents (`.context/` directory)
2. **Zero install** — `npx docdrift` works without global installation
3. **Multi-language** — tree-sitter WASM grammars, no native compilation needed
4. **AI-native** — generates agent rules on init so AI assistants use docdrift automatically
5. **Git-native** — context nodes are markdown, versioned alongside code, diffable in PRs

## Directory Structure

After `npx docdrift init`:

```
my-service/
├── .context/
│   ├── config.json              # Repo config (name, languages, settings)
│   ├── index.json               # Compiled index (auto-generated, gitignored)
│   ├── verified.json            # Baseline hashes (committed)
│   └── nodes/
│       ├── auth/
│       │   └── token-refresh.md
│       └── billing/
│           ├── invoice-flow.md
│           └── vat-calculation.md
├── .claude/rules/context.md     # Generated Claude Code rule
├── .cursor/rules/context.mdc    # Generated Cursor rule
├── src/
│   └── ...
└── ...
```

### What Gets Committed

| File                                 | Committed | Why                                                  |
| ------------------------------------ | --------- | ---------------------------------------------------- |
| `.context/config.json`               | Yes       | Repo settings shared with team                       |
| `.context/nodes/**/*.md`             | Yes       | The actual documentation                             |
| `.context/verified.json`             | Yes       | Baseline hashes — shared so drift works for everyone |
| `.context/index.json`                | No        | Auto-generated from nodes, rebuilt on demand         |
| Agent rules (`.claude/`, `.cursor/`) | Yes       | So AI assistants use docdrift in any clone           |

## Context Node Format

```yaml
---
id: billing/vat-calculation
title: "VAT Calculation Rules"
owner: team/billing
created: 2026-03-30
updated: 2026-03-30
tags: [billing, vat, tax]
refs:
  - path: src/services/BillingService.ts
    symbol: "calculateVAT(invoice: Invoice)"
  - path: src/services/BillingService.ts
    symbol: "determineVATRate(country: string, category: ProductCategory)"
relates_to:
  - id: billing/invoice-flow
    type: depends-on
---
## Why VAT Calculation Works This Way

[Business rationale in prose...]
```

### Differences from PoC

| PoC                                                                 | docdrift                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `code_refs` with `repo` + `path` + `symbol`                         | `refs` with `path` + `symbol` (repo-local, no repo field needed) |
| Cross-repo node IDs like `receipt-autobooking/confidence-threshold` | Same ID format, but nodes live in the repo they document         |
| Separate context repo                                               | `.context/` in each service repo                                 |
| `.wintctx-verified.json` in service repo root                       | `.context/verified.json`                                         |
| Python + tree-sitter C bindings                                     | TypeScript + web-tree-sitter (WASM)                              |
| `context drift` (redundant name)                                    | `docdrift check` or bare `docdrift`                              |
| `context set-baseline`                                              | `docdrift pin`                                                   |
| `context reviewed`                                                  | `docdrift ack`                                                   |

## Core Components

### 1. CLI (`src/cli.ts`)

Entry point. v1 ships 8 commands:

**Query** — read-only operations

- `lookup <path>` — find context nodes linked to a file (shows tracked symbols)
- `show <node-id>` — display full context node with metadata and prose

**Drift** — change detection lifecycle

- bare `docdrift` or `check` — compare current method hashes against verified baselines
- `pin` — record current state as known-good baseline
- `ack <node-id>` — acknowledge drift (docs still accurate)

**Maintain** — authoring

- `init` — scaffold `.context/` and generate AI rules
- `create` — interactive node creation with symbol search
- `edit <node-id>` — open in editor, validate after save

**Deferred to v2:** `search`, `graph`, `delete`, `validate`, `reindex` (auto-indexing handles most cases).

### 2. Tree-sitter Engine (`src/ast.ts`)

Uses `web-tree-sitter` (WASM) for zero-native-compilation parsing.

```
Source file → tree-sitter parse → walk declarations → extract symbol + body → SHA-256 hash
```

**Supported declaration types:**

- Methods/functions (with full parameter signatures)
- Classes, interfaces, structs, enums
- Properties, constructors

**Language support via WASM grammars:**

| Language              | Grammar Package                                     |
| --------------------- | --------------------------------------------------- |
| C#                    | `tree-sitter-c-sharp`                               |
| TypeScript/JavaScript | `tree-sitter-typescript` / `tree-sitter-javascript` |
| Python                | `tree-sitter-python`                                |
| Go                    | `tree-sitter-go`                                    |
| Java                  | `tree-sitter-java`                                  |
| Rust                  | `tree-sitter-rust`                                  |

Auto-detected from file extensions. `config.json` can override or limit languages.

### 3. Index Builder (`src/index.ts`)

Compiles all `.context/nodes/**/*.md` into `.context/index.json`:

```json
{
  "version": 1,
  "built_at": "2026-03-30T12:00:00Z",
  "tree_hash": "abc123...",
  "nodes": [...],
  "by_path": {
    "src/services/BillingService.ts": [
      { "node": "billing/vat-calculation", "symbol": "calculateVAT(...)" }
    ]
  },
  "by_tag": {
    "billing": ["billing/vat-calculation", "billing/invoice-flow"]
  }
}
```

**Staleness detection:** Compares stored `tree_hash` (git tree object hash of `.context/nodes/`) with current. Auto-rebuilds when stale.

### 4. Drift Detector (`src/drift.ts`)

```
For each ref in verified.json:
  1. Parse current file with tree-sitter
  2. Find the tracked symbol
  3. Hash its body
  4. Compare with stored baseline hash
  5. If different → drift hit
  6. If symbol missing → drift hit (renamed/removed)
```

**Verified baseline** (`.context/verified.json`):

```json
{
  "billing/vat-calculation": {
    "src/services/BillingService.ts:calculateVAT(invoice: Invoice)": {
      "content_hash": "8c67fc86f09453a5",
      "verified_at": "abc123...",
      "verified_date": "2026-03-30T12:00:00Z"
    }
  }
}
```

### 5. Init Scaffolder (`src/init.ts`)

`npx docdrift init` does:

1. Detect repo languages from file extensions
2. Create `.context/config.json` with repo name (from `package.json`, `.csproj`, or directory name)
3. Create `.context/nodes/` directory
4. Add `.context/index.json` to `.gitignore`
5. Generate AI provider rules:
   - `.claude/rules/context.md` — lookup-before-modify rule
   - `.cursor/rules/context.mdc` — equivalent Cursor rule
   - `.github/copilot-instructions.md` — append context instructions
6. Print next steps

### 6. Output Formatter (`src/output.ts`)

Styled terminal output using `chalk`:

- Cyan node IDs
- Bold titles
- Dim metadata and next steps
- `--json` flag on all commands for automation

## Data Flow

```
                    ┌─────────────────────┐
                    │  .context/nodes/*.md │ ← authored by humans/AI
                    └──────────┬──────────┘
                               │ auto-index
                               ▼
                    ┌─────────────────────┐
                    │  .context/index.json │ ← auto-generated
                    └──────────┬──────────┘
                               │ lookup/show
                               ▼
                    ┌─────────────────────┐
                    │   Query results     │ → developer / AI assistant
                    └─────────────────────┘

                    ┌─────────────────────┐
                    │   Source code files  │ ← tree-sitter parse
                    └──────────┬──────────┘
                               │ hash method bodies
                               ▼
                    ┌─────────────────────┐
                    │ .context/verified   │ ← baseline comparison
                    └──────────┬──────────┘
                               │ docdrift check
                               ▼
                    ┌─────────────────────┐
                    │   Drift warnings    │ → developer / CI
                    └─────────────────────┘
```

## CI Integration

```yaml
# GitHub Actions example
- name: Check for documentation drift
  run: npx docdrift check --ci
  # Exits non-zero if drift detected, blocks PR
```

The `--ci` flag outputs GitHub Actions annotations for inline PR comments on drifted files.

## Daily Workflow

```bash
# Day 0: Setup
docdrift init
docdrift create                     # links OrderService.calculateTotal to a node

# Day N: Morning
docdrift                            # "2 nodes drifted" — OrderService changed

# Investigate
docdrift show order-total-rounding  # read the context
docdrift lookup src/OrderService.ts # see all linked nodes

# After reviewing — docs are still accurate
docdrift ack order-total-rounding

# After a large refactor
docdrift pin                        # re-baseline everything
```

## Tech Stack

| Component     | Choice                 | Why                                   |
| ------------- | ---------------------- | ------------------------------------- |
| Runtime       | Node.js                | `npx` zero-install, universal         |
| Language      | TypeScript             | Type safety, good tooling             |
| Parser        | web-tree-sitter (WASM) | No native compilation, multi-language |
| CLI framework | yargs                  | Built-in tab completion, mature       |
| Prompts       | @clack/prompts         | Beautiful interactive flows           |
| Styling       | chalk                  | Terminal colors, widely used          |
| YAML parsing  | yaml (npm)             | Full YAML spec support                |
| Hashing       | Node.js crypto         | Built-in, no deps                     |
| Testing       | vitest                 | Fast, TypeScript-native               |
