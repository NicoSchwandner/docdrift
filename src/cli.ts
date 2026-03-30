#!/usr/bin/env node

/**
 * docdrift CLI — Link business decisions to source code.
 *
 * Entry point. Registers all v1 commands with tab completion.
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
  .scriptName("docdrift")
  .version("0.0.1")
  .usage("$0 [command]", "Check for drift (default)", {}, async () => {
    // Bare `docdrift` = check for drift
    console.log("Not yet implemented");
  })

  // -- Query --

  .command(
    "lookup <path>",
    "Find context nodes linked to a source file",
    (y) =>
      y
        .positional("path", { type: "string", demandOption: true })
        .option("json", { type: "boolean", describe: "Output as JSON" }),
    async () => {
      console.log("Not yet implemented");
    },
  )

  .command(
    "show <node-id>",
    "Display the full content of a context node",
    (y) =>
      y
        .positional("node-id", { type: "string", demandOption: true })
        .option("raw", { type: "boolean", describe: "Show raw frontmatter" })
        .option("json", { type: "boolean", describe: "Output as JSON" }),
    async () => {
      console.log("Not yet implemented");
    },
  )

  // -- Drift lifecycle --

  .command(
    "check",
    "Check for drift between context nodes and source code",
    (y) =>
      y
        .option("ci", {
          type: "boolean",
          describe: "Output GitHub Actions annotations",
        })
        .option("all", {
          type: "boolean",
          describe: "Show acknowledged drift too",
        })
        .option("json", { type: "boolean", describe: "Output as JSON" }),
    async () => {
      console.log("Not yet implemented");
    },
  )

  .command(
    "pin",
    "Record current code state as the known-good baseline",
    (y) =>
      y
        .option("node", {
          type: "string",
          describe: "Pin a specific node only",
        })
        .option("force", {
          type: "boolean",
          describe: "Re-pin even if baseline exists",
        }),
    async () => {
      console.log("Not yet implemented");
    },
  )

  .command(
    "ack <node-id>",
    "Mark context as still accurate after code changes",
    (y) => y.positional("node-id", { type: "string", demandOption: true }),
    async () => {
      console.log("Not yet implemented");
    },
  )

  // -- Maintain --

  .command(
    "init",
    "Initialize docdrift in the current repository",
    {},
    async () => {
      console.log("Not yet implemented");
    },
  )

  .command(
    "create",
    "Create a new context node interactively",
    {},
    async () => {
      console.log("Not yet implemented");
    },
  )

  .command(
    "edit <node-id>",
    "Open a context node in your editor",
    (y) => y.positional("node-id", { type: "string", demandOption: true }),
    async () => {
      console.log("Not yet implemented");
    },
  )

  // -- Tab completion --

  .completion(
    "completion",
    "Generate shell completion script",
    (current, argv, defaultCompletions, done) => {
      const cmdsNeedingNodeId = ["show", "ack", "edit"];
      const cmd = argv._[0] as string;

      if (cmdsNeedingNodeId.includes(cmd)) {
        // TODO: read .context/index.json and return node IDs
        done([]);
      } else {
        defaultCompletions(done);
      }
    },
  )

  .strict()
  .demandCommand(0)
  .help()
  .parse();
