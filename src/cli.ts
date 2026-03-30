#!/usr/bin/env node

/**
 * docdrift CLI — Link business decisions to source code.
 *
 * Entry point. Registers all v1 commands.
 */

import { Command } from "commander";

const program = new Command();

program
  .name("docdrift")
  .description(
    "Link business decisions to source code. Detect when code drifts from documentation.",
  )
  .version("0.0.1")
  .action(async (_opts) => {
    // Bare `docdrift` = check for drift (most common action)
    console.log("Not yet implemented");
  });

// -- Query --

program
  .command("lookup <path>")
  .description("Find context nodes linked to a source file")
  .option("--json", "Output as JSON")
  .action(async (_path, _opts) => {
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

// -- Drift lifecycle --

program
  .command("check")
  .description("Check for drift between context nodes and source code")
  .option("--ci", "Output GitHub Actions annotations")
  .option("--all", "Show acknowledged drift too")
  .option("--json", "Output as JSON")
  .action(async (_opts) => {
    console.log("Not yet implemented");
  });

program
  .command("pin")
  .description("Record current code state as the known-good baseline")
  .option("--node <id>", "Pin a specific node only")
  .option("--force", "Re-pin even if baseline exists")
  .action(async (_opts) => {
    console.log("Not yet implemented");
  });

program
  .command("ack <node-id>")
  .description("Mark context as still accurate after code changes")
  .action(async (_nodeId) => {
    console.log("Not yet implemented");
  });

// -- Maintain --

program
  .command("init")
  .description("Initialize docdrift in the current repository")
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

program.parse();
