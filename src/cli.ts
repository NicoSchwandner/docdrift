#!/usr/bin/env node

/**
 * docdrift CLI — Link business decisions to source code.
 *
 * Entry point. Registers all v1 commands with tab completion.
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runInit } from "./commands/init.js";
import { runLookup } from "./commands/lookup.js";
import { runShow } from "./commands/show.js";
import { runCheck } from "./commands/check.js";
import { runPin } from "./commands/pin.js";
import { runAck } from "./commands/ack.js";
import { runCreate } from "./commands/create.js";
import { runEdit } from "./commands/edit.js";
import { findContextDir, ensureIndex } from "./index.js";

yargs(hideBin(process.argv))
  .scriptName("docdrift")
  .version("0.0.1")
  .usage("$0 [command]", "Check for drift (default)", {}, async () => {
    process.exitCode = await runCheck({});
  })

  // -- Query --

  .command(
    "lookup <path>",
    "Find context nodes linked to a source file",
    (y) =>
      y
        .positional("path", { type: "string", demandOption: true })
        .option("json", { type: "boolean", describe: "Output as JSON" }),
    async (argv) => {
      process.exitCode = await runLookup(argv.path!, argv.json ?? false);
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
    async (argv) => {
      process.exitCode = await runShow(
        argv["node-id"]!,
        argv.raw ?? false,
        argv.json ?? false,
      );
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
    async (argv) => {
      process.exitCode = await runCheck({
        ci: argv.ci,
        all: argv.all,
        json: argv.json,
      });
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
    async (argv) => {
      process.exitCode = await runPin({
        node: argv.node,
        force: argv.force,
      });
    },
  )

  .command(
    "ack <node-id>",
    "Mark context as still accurate after code changes",
    (y) => y.positional("node-id", { type: "string", demandOption: true }),
    async (argv) => {
      process.exitCode = await runAck(argv["node-id"]!);
    },
  )

  // -- Maintain --

  .command(
    "init",
    "Initialize docdrift in the current repository",
    (y) =>
      y.option("nodes-dir", {
        type: "string",
        describe:
          "Path for context nodes relative to repo root (default: docs)",
      }),
    async (argv) => {
      await runInit({ nodesDir: argv["nodes-dir"] });
    },
  )

  .command(
    "create",
    "Create a new context node interactively",
    {},
    async () => {
      process.exitCode = await runCreate();
    },
  )

  .command(
    "edit <node-id>",
    "Open a context node in your editor",
    (y) => y.positional("node-id", { type: "string", demandOption: true }),
    async (argv) => {
      process.exitCode = await runEdit(argv["node-id"]!);
    },
  )

  // -- Tab completion --

  .completion(
    "completion",
    "Generate shell completion script",
    async (current: string, argv: any, defaultCompletions: any, done: any) => {
      const cmdsNeedingNodeId = ["show", "ack", "edit"];
      const cmd = argv._[0] as string;

      if (cmdsNeedingNodeId.includes(cmd)) {
        try {
          const contextDir = findContextDir();
          if (contextDir) {
            const index = await ensureIndex(contextDir);
            done(index.nodes.map((n) => n.id));
            return;
          }
        } catch {}
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
