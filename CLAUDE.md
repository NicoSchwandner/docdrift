# docdrift

CLI tool that links business decision documentation to source code at the method level and detects when code drifts from documentation.

## Project State

This is a **new TypeScript rewrite** of a working Python PoC. The architecture is designed, requirements are extracted, CLI commands are defined — but no functionality is implemented yet. All commands are stubs.

### What Exists

- `docs/architecture.md` — full technical design, data flow, component breakdown
- `docs/requirements.md` — user stories grouped by v1/v2 scope
- `src/cli.ts` — CLI skeleton with all v1 commands registered (Commander.js)
- `package.json` — dependencies declared, npm name `docdrift` secured
- `.github/workflows/publish.yml` — GitHub release triggers npm publish

### What Needs Building

All core components, in recommended build order:

1. **Node parser** (`src/node.ts`) — parse `.context/nodes/**/*.md` files, extract YAML frontmatter (id, title, owner, tags, refs, relates_to) and markdown body. Use the `yaml` npm package.

2. **Index builder** (`src/index.ts`) — compile all nodes into `.context/index.json` with secondary indices (`by_path`, `by_tag`). Include git tree hash for O(1) staleness detection. Auto-rebuild when stale.

3. **Tree-sitter engine** (`src/ast.ts`) — use `web-tree-sitter` (WASM) to parse source files, walk declaration nodes, extract method signatures, compute SHA-256 content hashes. Must support: C#, TypeScript/JavaScript, Python, Go, Java, Rust. See PoC reference below.

4. **Output formatter** (`src/output.ts`) — styled terminal output with chalk/picocolors. Cyan node IDs, bold titles, dim metadata. All commands support `--json`.

5. **Commands** — implement in this order:
   - `init` — scaffold `.context/`, detect languages, generate AI rules
   - `lookup` — find nodes by file path using index
   - `show` — display full node content
   - `check` (+ bare `docdrift`) — drift detection via content hash comparison
   - `pin` — record baselines in `.context/verified.json`
   - `ack` — update baseline for a specific node
   - `create` — interactive node creation with symbol search
   - `edit` — open in `$EDITOR`, validate after

6. **Tests** — vitest, test each component

## PoC Reference

The working Python implementation is at:
`/Users/nico/code/work/ExplorationDays_ContextGraph_NicoSchwandner/`

Key files to reference when porting:

| Component       | PoC file                      | Port to         |
| --------------- | ----------------------------- | --------------- |
| AST extraction  | `src/wintctx/ast_hash.py`     | `src/ast.ts`    |
| Index building  | `src/wintctx/build_index.py`  | `src/index.ts`  |
| Drift detection | `src/wintctx/drift_detect.py` | `src/drift.ts`  |
| Index freshness | `src/wintctx/index_utils.py`  | `src/index.ts`  |
| CLI commands    | `src/wintctx/commands/`       | `src/commands/` |
| Output styling  | `src/wintctx/output.py`       | `src/output.ts` |
| Node schema     | `schema/context.schema.json`  | `src/schema.ts` |

### Key Differences from PoC

| Aspect            | PoC                                          | docdrift                                  |
| ----------------- | -------------------------------------------- | ----------------------------------------- |
| Scope             | Cross-repo (separate context repo)           | **Repo-local** (`.context/` in each repo) |
| Code refs         | `repo` + `path` + `symbol`                   | `path` + `symbol` only (no repo field)    |
| Baseline location | `.wintctx-verified.json` in target repo root | `.context/verified.json`                  |
| Tree-sitter       | Native C bindings (Python)                   | **WASM** (`web-tree-sitter`)              |
| Commands          | `drift`, `set-baseline`, `reviewed`          | `check`, `pin`, `ack`                     |
| Bare invocation   | Shows help                                   | **Runs drift check**                      |

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript (ESM)
- **CLI:** yargs for routing + built-in tab completion, @clack/prompts for interactive flows
- **Parser:** web-tree-sitter (WASM grammars, no native compilation)
- **Output:** chalk or picocolors
- **YAML:** yaml (npm)
- **Hashing:** Node.js built-in crypto
- **Testing:** vitest

## Commands (v1)

```
docdrift                     # bare = check for drift (default action)
docdrift check               # explicit check (alias for bare)
docdrift check --ci          # GitHub Actions annotations
docdrift check --json        # structured output

docdrift init                # scaffold .context/ and AI rules
docdrift create              # interactive node creation
docdrift edit <node-id>      # open in $EDITOR

docdrift lookup <path>       # find nodes linked to a file
docdrift show <node-id>      # display full node

docdrift pin                 # record baseline hashes
docdrift pin --node <id>     # pin single node
docdrift pin --force         # re-pin even if exists
docdrift ack <node-id>       # mark drift as reviewed
```

## Directory Structure (after init)

```
target-repo/
├── .context/
│   ├── config.json          # repo name, language settings
│   ├── index.json           # auto-generated (gitignored)
│   ├── verified.json        # baseline hashes (committed)
│   └── nodes/
│       └── domain/
│           └── node-name.md
├── .claude/rules/context.md # generated AI rule
└── src/
```

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
## Why This Works This Way

[Prose explaining the business decision...]
```

## Tree-sitter WASM Setup

web-tree-sitter requires loading WASM binaries at runtime. Pattern:

```typescript
import Parser from "web-tree-sitter";

await Parser.init();
const parser = new Parser();
const Lang = await Parser.Language.load("path/to/tree-sitter-typescript.wasm");
parser.setLanguage(Lang);
const tree = parser.parse(sourceCode);
```

WASM grammar files need to be bundled with the package or downloaded on first use. Check how other tools handle this (e.g., `ast-grep` ships WASM in the npm package).

## Drift Detection Algorithm

```
For each node in index:
  For each ref in node.refs:
    1. Read the source file at ref.path
    2. Parse with tree-sitter for the file's language
    3. Walk AST to find declaration matching ref.symbol
    4. Extract body bytes (start_byte to end_byte)
    5. SHA-256 hash, truncate to 16 hex chars
    6. Compare with .context/verified.json[node.id][ref_key].content_hash
    7. If different or missing → report drift
```
