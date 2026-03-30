import { describe, it, expect } from "vitest";
import { findSymbolInSource, getSupportedExtensions } from "../src/ast.js";

describe("getSupportedExtensions", () => {
  it("includes core language extensions", () => {
    const exts = getSupportedExtensions();
    expect(exts.has(".cs")).toBe(true);
    expect(exts.has(".ts")).toBe(true);
    expect(exts.has(".py")).toBe(true);
    expect(exts.has(".go")).toBe(true);
    expect(exts.has(".java")).toBe(true);
    expect(exts.has(".rs")).toBe(true);
  });
});

describe("findSymbolInSource", () => {
  it("finds a TypeScript function", async () => {
    const source = `
function greet(name: string): string {
  return "Hello, " + name;
}
`;
    const result = await findSymbolInSource(
      source,
      "greet(name: string)",
      ".ts",
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("greet");
    expect(result!.contentHash).toHaveLength(16);
    expect(result!.body).toContain("Hello");
  });

  it("finds a C# method", async () => {
    const source = `
public class MyService {
    public int Calculate(int a, int b) {
        return a + b;
    }
}
`;
    const result = await findSymbolInSource(
      source,
      "Calculate(int a, int b)",
      ".cs",
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Calculate");
    expect(result!.contentHash).toHaveLength(16);
  });

  it("finds a C# class", async () => {
    const source = `
public class MyService {
    public int Value { get; set; }
}
`;
    const result = await findSymbolInSource(source, "class MyService", ".cs");
    expect(result).not.toBeNull();
    expect(result!.signature).toContain("class MyService");
  });

  it("finds a Python function", async () => {
    const source = `
def calculate_total(items, tax_rate):
    subtotal = sum(item.price for item in items)
    return subtotal * (1 + tax_rate)
`;
    const result = await findSymbolInSource(
      source,
      "calculate_total(items, tax_rate)",
      ".py",
    );
    expect(result).not.toBeNull();
    expect(result!.name).toBe("calculate_total");
  });

  it("returns null for unknown symbol", async () => {
    const source = `function foo() { return 1; }`;
    const result = await findSymbolInSource(source, "bar()", ".ts");
    expect(result).toBeNull();
  });

  it("returns null for unsupported extension", async () => {
    const result = await findSymbolInSource("anything", "foo()", ".xyz");
    expect(result).toBeNull();
  });

  it("detects content hash change", async () => {
    const source1 = `function calc(x: number): number { return x * 2; }`;
    const source2 = `function calc(x: number): number { return x * 3; }`;

    const result1 = await findSymbolInSource(source1, "calc(x: number)", ".ts");
    const result2 = await findSymbolInSource(source2, "calc(x: number)", ".ts");

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.contentHash).not.toBe(result2!.contentHash);
  });
});
