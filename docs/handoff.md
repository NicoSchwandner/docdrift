# Handoff: Build docdrift v1

## Your Task

Implement all v1 functionality for docdrift. The architecture is designed, requirements are written, and the CLI skeleton exists with stub commands. You need to build the actual logic.

## Before You Start

1. Read `CLAUDE.md` — project overview, tech stack, all conventions
2. Read `docs/architecture.md` — component design, data flow, directory structure
3. Read `docs/requirements.md` — user stories with acceptance criteria
4. Read `src/cli.ts` — current CLI skeleton (yargs, all commands registered as stubs)
5. Read the PoC implementations you'll be porting from (see mapping below)

## PoC Reference

There is a **working Python implementation** at:
`/Users/nico/code/work/ExplorationDays_ContextGraph_NicoSchwandner/`

Read the PoC source before writing each component. The logic is proven — port it to TypeScript, adapting for the differences listed in CLAUDE.md.

| Component         | Read this PoC file first           | Write this      |
| ----------------- | ---------------------------------- | --------------- |
| AST extraction    | `src/wintctx/ast_hash.py`          | `src/ast.ts`    |
| Index building    | `src/wintctx/build_index.py`       | `src/index.ts`  |
| Drift detection   | `src/wintctx/drift_detect.py`      | `src/drift.ts`  |
| Index freshness   | `src/wintctx/index_utils.py`       | `src/index.ts`  |
| Output styling    | `src/wintctx/output.py`            | `src/output.ts` |
| Node schema       | `schema/context.schema.json`       | `src/schema.ts` |
| Query commands    | `src/wintctx/commands/query.py`    | `src/commands/` |
| Drift commands    | `src/wintctx/commands/drift.py`    | `src/commands/` |
| Maintain commands | `src/wintctx/commands/maintain.py` | `src/commands/` |

## Build Order

Build and test each component before moving to the next:

### Phase 1: Core infrastructure

1. `npm install` to get dependencies
2. `src/node.ts` — parse markdown frontmatter + body from `.context/nodes/**/*.md`
3. `src/index.ts` — build index from nodes, staleness detection via git tree hash
4. `src/output.ts` — styled terminal output (chalk, `--json` support)

### Phase 2: Query commands

5. `init` command — scaffold `.context/`, detect languages, generate AI provider rules (Claude, Cursor, Copilot)
6. `lookup` command — find nodes by file path using `by_path` index
7. `show` command — display full node with styled output

### Phase 3: Drift detection

8. `src/ast.ts` — tree-sitter WASM engine (multi-language symbol extraction + hashing)
9. `check` command (+ bare `docdrift`) — compare live hashes against `.context/verified.json`
10. `pin` command — record baseline hashes
11. `ack` command — update baseline for reviewed node

### Phase 4: Authoring

12. `create` command — interactive node creation with @clack/prompts (symbol search, multi-select)
13. `edit` command — open in `$EDITOR`, validate after save

### Phase 5: Polish

14. Tab completion — read node IDs from index for `show`, `ack`, `edit`
15. Tests for each component (vitest)
16. Verify `npx docdrift` works end-to-end

## Key Decisions Already Made

- **Repo-local only** — no cross-repo support. Nodes live in `.context/` inside the repo they document.
- **Code refs have no `repo` field** — just `path` + `symbol` (since everything is repo-local).
- **Bare `docdrift` runs drift check** — not help.
- **Command names:** `check` (not `drift`), `pin` (not `set-baseline`), `ack` (not `reviewed`).
- **web-tree-sitter WASM** — no native compilation. Research how to bundle/load WASM grammars.
- **`.context/verified.json` is committed** — shared with team so drift works for everyone.
- **`.context/index.json` is gitignored** — auto-generated, auto-rebuilt when stale.

## How to Verify

After each phase, verify:

- `npm run build` succeeds
- `npm test` passes
- The implemented commands work when run via `npx tsx src/cli.ts <command>`

Final verification:

- `npx docdrift init` in a test repo scaffolds correctly
- `npx docdrift create` creates a valid node
- `npx docdrift pin` records baselines
- Modify a tracked method → `npx docdrift` reports drift
- `npx docdrift ack <node-id>` clears the drift
