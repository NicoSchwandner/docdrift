# Requirements

Extracted from the [PoC](https://github.com/WintDev/ExplorationDays_ContextGraph_NicoSchwandner) built during Exploration Days 2026-03-25/26.

## Querying & Discovery

**As a developer**, I want to find which context nodes reference a specific source file so that I understand the business decisions behind code I'm about to modify.

- `ctxgraph lookup <path>` with symbol names shown per node
- JSON output for tool integration
- Exit codes: 0=found, 1=not found

**As a developer**, I want to view the complete content of a context node so that I understand why code exists and what decisions shaped it.

- `ctxgraph show <node-id>` with styled header, code refs, and markdown body
- `--raw` for unformatted frontmatter, `--json` for structured data

**As a developer**, I want to search for context nodes by tag or keyword so that I can discover related documentation.

- `ctxgraph search --tag <tag>` (exact match via index)
- `ctxgraph search --query <text>` (substring in titles and body)
- `--title-only` to limit scope

**As an architect**, I want to visualize relationships between context nodes so that I understand decision dependencies.

- `ctxgraph graph <node-id>` showing edges in and out
- Relationship types: implements, depends-on, justified-by, supersedes, overrides, related

## Drift Detection

**As a developer**, I want to detect when tracked methods have changed since context was last reviewed so that I know when documentation is stale.

- `ctxgraph drift` compares tree-sitter content hashes against baselines
- Reports: node ID, file path, symbol name, drift reason
- Exit code 1 on drift (for CI gating)
- JSON output for automation

**As a developer**, I want to establish a baseline for drift detection so that only real changes are flagged.

- `ctxgraph set-baseline` hashes all tracked methods via tree-sitter
- Stores in `.context/verified.json` (committed, shared with team)
- `--force` to re-baseline, `--node <id>` for single node
- Safety guard against accidental re-baseline

**As a developer**, I want to mark drift as reviewed so that acknowledged changes don't produce noise.

- `ctxgraph reviewed <node-id>` updates baseline to current state
- Drift reappears only if the method changes again

## Maintenance & Authoring

**As a developer**, I want to initialize ctxgraph in my repo so that I can start documenting decisions.

- `ctxgraph init` scaffolds `.context/` directory structure
- Auto-detects languages from file extensions
- Generates AI provider rules (Claude, Cursor, Copilot)
- Adds `.context/index.json` to `.gitignore`

**As a context author**, I want to create a new context node interactively so that I don't need to write YAML manually.

- `ctxgraph create` prompts for: title, ID path, owner, tags
- Interactive symbol search: list files, search declarations, multi-select
- Auto-generates frontmatter with timestamps
- Opens editor for prose content
- Lints before saving

**As a context author**, I want to edit an existing node and have it validated afterward.

- `ctxgraph edit <node-id>` opens in `$EDITOR`
- Auto-lints after editor closes

**As a context author**, I want to delete a node and handle dangling references.

- `ctxgraph delete <node-id>` checks for incoming references
- Offers: delete + remove refs, redirect refs to another node, or cancel

**As a maintainer**, I want to validate all nodes against the schema.

- `ctxgraph validate` checks required fields, ID format, owner format, ref structure
- Reports errors with file paths and line numbers

**As a maintainer**, I want to rebuild the index after manual edits.

- `ctxgraph reindex` recompiles `index.json` from all nodes
- Normally auto-triggered (staleness detection via git tree hash)

## Tree-sitter AST Engine

**As a tool**, I need to extract method signatures and hash method bodies across multiple languages.

- web-tree-sitter (WASM) — no native compilation
- Declaration types: methods, functions, classes, interfaces, structs, enums, properties, constructors
- Signature normalization for stable matching
- SHA-256 hash of method body, truncated to 16 hex chars
- Languages: C#, TypeScript/JavaScript, Python, Go, Java, Rust

## Index & Cache

**As the system**, the index must auto-rebuild when stale.

- Git tree hash comparison for O(1) staleness check
- Auto-rebuild before any query if stale
- Graceful fallback to stale index if rebuild fails (read-only filesystem)

**As the system**, baselines must be committed and shared.

- `.context/verified.json` is committed so drift works for every developer
- Updated by `set-baseline` and `reviewed`

## AI Integration

**As an AI coding assistant**, I need to check context before modifying tracked files.

- `ctxgraph init` generates provider-specific rules:
  - Claude: `.claude/rules/context.md`
  - Cursor: `.cursor/rules/context.mdc`
  - Copilot: `.github/copilot-instructions.md` (append)
- Rules instruct the agent to run `npx ctxgraph lookup <path>` before modifying files
- If context exists, read it with `npx ctxgraph show <node-id>`
- If requested change contradicts documented rationale, surface the conflict

**As a developer**, I want drift detection in CI so that PRs with stale context are flagged.

- `ctxgraph drift --ci` outputs GitHub Actions annotations
- Non-zero exit code blocks merge

## Output & UX

**As a user**, I want styled, scannable terminal output.

- Cyan node IDs, bold titles, dim metadata
- Grouped help with command categories
- `--json` on all commands for scripting

**As a user**, I want clear error messages with suggested fixes.

- Exit codes: 0=success, 1=logical failure, 2=error
- Actionable "next steps" suggestions
