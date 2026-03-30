import { describe, it, expect, beforeEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  checkDrift,
  pinNode,
  ackNode,
  type VerifiedCache,
} from "../src/drift.js";
import type { ContextNode } from "../src/node.js";

const tmpDir = path.join(os.tmpdir(), "docdrift-test-" + Date.now());

function makeNode(overrides: Partial<ContextNode> = {}): ContextNode {
  return {
    id: "test/node",
    title: "Test Node",
    owner: "team/test",
    created: "2026-03-30",
    updated: "2026-03-30",
    tags: [],
    refs: [{ path: "src/calc.ts", symbol: "add(a: number, b: number)" }],
    relates_to: [],
    body: "Test body",
    file: "nodes/test/node.md",
    ...overrides,
  };
}

beforeEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(path.join(tmpDir, "src"), { recursive: true });
  await writeFile(
    path.join(tmpDir, "src/calc.ts"),
    `function add(a: number, b: number): number {\n  return a + b;\n}\n`,
  );
});

describe("pinNode", () => {
  it("pins a node and records content hash", async () => {
    const verified: VerifiedCache = {};
    const node = makeNode();
    const { pinned } = await pinNode(node, verified, tmpDir, false);

    expect(pinned).toBe(1);
    expect(verified["test/node"]).toBeDefined();
    const refEntry =
      verified["test/node"]["src/calc.ts:add(a: number, b: number)"];
    expect(refEntry).toBeDefined();
    expect(refEntry.content_hash).toHaveLength(16);
  });

  it("skips already-pinned refs without --force", async () => {
    const verified: VerifiedCache = {};
    const node = makeNode();
    await pinNode(node, verified, tmpDir, false);
    const { pinned, skipped } = await pinNode(node, verified, tmpDir, false);

    expect(pinned).toBe(0);
    expect(skipped).toBe(1);
  });

  it("re-pins with --force", async () => {
    const verified: VerifiedCache = {};
    const node = makeNode();
    await pinNode(node, verified, tmpDir, false);
    const { pinned } = await pinNode(node, verified, tmpDir, true);

    expect(pinned).toBe(1);
  });
});

describe("checkDrift", () => {
  it("reports no drift when baseline matches", async () => {
    const verified: VerifiedCache = {};
    const node = makeNode();
    await pinNode(node, verified, tmpDir, false);

    const hits = await checkDrift([node], verified, tmpDir);
    expect(hits).toHaveLength(0);
  });

  it("reports drift when content changes", async () => {
    const verified: VerifiedCache = {};
    const node = makeNode();
    await pinNode(node, verified, tmpDir, false);

    // Modify the file
    await writeFile(
      path.join(tmpDir, "src/calc.ts"),
      `function add(a: number, b: number): number {\n  return a + b + 1;\n}\n`,
    );

    const hits = await checkDrift([node], verified, tmpDir);
    expect(hits).toHaveLength(1);
    expect(hits[0].reason).toContain("Content changed");
  });

  it("reports drift when symbol is removed", async () => {
    const verified: VerifiedCache = {};
    const node = makeNode();
    await pinNode(node, verified, tmpDir, false);

    // Remove the symbol
    await writeFile(path.join(tmpDir, "src/calc.ts"), `// empty file\n`);

    const hits = await checkDrift([node], verified, tmpDir);
    expect(hits).toHaveLength(1);
    expect(hits[0].reason).toContain("not found");
  });

  it("skips unpinned nodes", async () => {
    const node = makeNode();
    const hits = await checkDrift([node], {}, tmpDir);
    expect(hits).toHaveLength(0);
  });
});

describe("ackNode", () => {
  it("updates baseline to current state", async () => {
    const verified: VerifiedCache = {};
    const node = makeNode();
    await pinNode(node, verified, tmpDir, false);

    // Modify file
    await writeFile(
      path.join(tmpDir, "src/calc.ts"),
      `function add(a: number, b: number): number {\n  return a + b + 1;\n}\n`,
    );

    // Verify drift exists
    let hits = await checkDrift([node], verified, tmpDir);
    expect(hits).toHaveLength(1);

    // Ack it
    await ackNode(node, verified, tmpDir);

    // Now no drift
    hits = await checkDrift([node], verified, tmpDir);
    expect(hits).toHaveLength(0);
  });
});
