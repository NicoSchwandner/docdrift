#!/usr/bin/env node

/**
 * ctxgraph CLI — Link business decisions to source code.
 *
 * Entry point. Registers all commands grouped by category.
 */

import { Command } from "commander";

const program = new Command();

program
  .name("ctxgraph")
  .description(
    "Link business decisions to source code. Detect when code drifts from documentation.",
  )
  .version("0.0.1");

// -- Query commands --

program
  .command("lookup <path>")
  .description("Find context nodes linked to a source file")
  .option("--json", "Output as JSON")
  .action(async (_path, _opts) => {
    // TODO: implement
    console.log("Not yet implemented");
  });

program
  .command("show <node-id>")
  .description("Display the full content of a context node")
  .option("--raw", "Show raw frontmatter")
  .option("--json", "Output as JSON")
  .action(async (_nodeId, _opts) => {
    console.log("Not yet implemented");
  });

program
  .command("search")
  .description("Search for context nodes by tag or keyword")
  .option("--tag <tag>", "Search by exact tag")
  .option("--query <text>", "Search by keyword")
  .option("--title-only", "Limit search to titles")
  .option("--json", "Output as JSON")
  .action(async (_opts) => {
    console.log("Not yet implemented");
  });

program
  .command("graph <node-id>")
  .description("Show a node's relationships (edges in and out)")
  .option("--json", "Output as JSON")
  .action(async (_nodeId, _opts) => {
    console.log("Not yet implemented");
  });

// -- Drift lifecycle commands --

program
  .command("drift")
  .description("Check for drift between context nodes and source code")
  .option("--ci", "Output GitHub Actions annotations")
  .option("--all", "Show acknowledged drift too")
  .option("--json", "Output as JSON")
  .action(async (_opts) => {
    console.log("Not yet implemented");
  });

program
  .command("set-baseline")
  .description("Record current code state as the known-good baseline")
  .option("--node <id>", "Baseline a specific node only")
  .option("--force", "Re-baseline even if one exists")
  .action(async (_opts) => {
    console.log("Not yet implemented");
  });

program
  .command("reviewed <node-id>")
  .description("Mark context as still accurate after code changes")
  .action(async (_nodeId) => {
    console.log("Not yet implemented");
  });

// -- Maintain commands --

program
  .command("init")
  .description("Initialize ctxgraph in the current repository")
  .action(async () => {
    console.log("Not yet implemented");
  });

program
  .command("create")
  .description("Create a new context node interactively")
  .action(async () => {
    console.log("Not yet implemented");
  });

program
  .command("edit <node-id>")
  .description("Open a context node in your editor")
  .action(async (_nodeId) => {
    console.log("Not yet implemented");
  });

program
  .command("delete <node-id>")
  .description("Delete a context node")
  .action(async (_nodeId) => {
    console.log("Not yet implemented");
  });

program
  .command("validate")
  .description("Validate all context nodes against the schema")
  .option("--json", "Output as JSON")
  .action(async (_opts) => {
    console.log("Not yet implemented");
  });

program
  .command("reindex")
  .description("Rebuild index.json from all context nodes")
  .option("--json", "Output as JSON")
  .action(async (_opts) => {
    console.log("Not yet implemented");
  });

program.parse();
