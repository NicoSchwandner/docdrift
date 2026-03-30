import { describe, it, expect } from "vitest";
import { parseFrontmatter, parseNode } from "../src/node.js";

const VALID_NODE = `---
id: billing/vat-calculation
title: "VAT Calculation Rules"
owner: team/billing
created: 2026-03-30
updated: 2026-03-30
tags: [billing, vat]
refs:
  - path: src/services/BillingService.ts
    symbol: "calculateVAT(invoice: Invoice)"
relates_to:
  - id: billing/invoice-flow
    type: depends-on
---
## Why VAT Works This Way

Business rationale here.
`;

describe("parseFrontmatter", () => {
  it("extracts meta and body", () => {
    const { meta, body } = parseFrontmatter(VALID_NODE);
    expect(meta.id).toBe("billing/vat-calculation");
    expect(meta.title).toBe("VAT Calculation Rules");
    expect(body).toContain("Business rationale here.");
  });

  it("throws on missing frontmatter", () => {
    expect(() => parseFrontmatter("no frontmatter here")).toThrow(
      "missing YAML frontmatter",
    );
  });
});

describe("parseNode", () => {
  it("parses a valid node", () => {
    const node = parseNode(VALID_NODE, "nodes/billing/vat-calculation.md");
    expect(node.id).toBe("billing/vat-calculation");
    expect(node.title).toBe("VAT Calculation Rules");
    expect(node.owner).toBe("team/billing");
    expect(node.tags).toEqual(["billing", "vat"]);
    expect(node.refs).toHaveLength(1);
    expect(node.refs[0].path).toBe("src/services/BillingService.ts");
    expect(node.refs[0].symbol).toBe("calculateVAT(invoice: Invoice)");
    expect(node.relates_to).toHaveLength(1);
    expect(node.relates_to[0].id).toBe("billing/invoice-flow");
    expect(node.relates_to[0].type).toBe("depends-on");
    expect(node.body).toContain("Business rationale");
    expect(node.file).toBe("nodes/billing/vat-calculation.md");
  });

  it("throws on missing id", () => {
    const content = `---
title: "Test"
owner: team/test
---
Body`;
    expect(() => parseNode(content, "test.md")).toThrow(
      "missing required field 'id'",
    );
  });

  it("handles missing optional fields", () => {
    const content = `---
id: test/minimal
title: "Minimal Node"
owner: team/test
---
Body`;
    const node = parseNode(content, "test.md");
    expect(node.tags).toEqual([]);
    expect(node.refs).toEqual([]);
    expect(node.relates_to).toEqual([]);
  });
});
