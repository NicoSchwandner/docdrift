/**
 * Tree-sitter WASM engine — multi-language symbol extraction and content hashing.
 *
 * Parses source files, walks declaration nodes, extracts method signatures,
 * and computes SHA-256 content hashes for drift detection.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import path from "node:path";
import Parser from "web-tree-sitter";

const exec = promisify(execFile);

const require = createRequire(import.meta.url);

export interface SymbolInfo {
  name: string;
  signature: string;
  startLine: number;
  endLine: number;
  contentHash: string;
  body: string;
}

// Language config: extension → grammar file name
const LANG_CONFIG: Record<
  string,
  { grammar: string; declarations: Set<string> }
> = {
  ".cs": {
    grammar: "tree-sitter-c_sharp",
    declarations: new Set([
      "method_declaration",
      "class_declaration",
      "enum_declaration",
      "interface_declaration",
      "struct_declaration",
      "constructor_declaration",
      "property_declaration",
    ]),
  },
  ".ts": {
    grammar: "tree-sitter-typescript",
    declarations: new Set([
      "function_declaration",
      "method_definition",
      "class_declaration",
      "interface_declaration",
      "enum_declaration",
      "arrow_function",
      "lexical_declaration",
    ]),
  },
  ".tsx": {
    grammar: "tree-sitter-typescript",
    declarations: new Set([
      "function_declaration",
      "method_definition",
      "class_declaration",
      "interface_declaration",
      "enum_declaration",
      "arrow_function",
      "lexical_declaration",
    ]),
  },
  ".js": {
    grammar: "tree-sitter-javascript",
    declarations: new Set([
      "function_declaration",
      "method_definition",
      "class_declaration",
      "arrow_function",
      "lexical_declaration",
    ]),
  },
  ".jsx": {
    grammar: "tree-sitter-javascript",
    declarations: new Set([
      "function_declaration",
      "method_definition",
      "class_declaration",
      "arrow_function",
      "lexical_declaration",
    ]),
  },
  ".py": {
    grammar: "tree-sitter-python",
    declarations: new Set(["function_definition", "class_definition"]),
  },
  ".go": {
    grammar: "tree-sitter-go",
    declarations: new Set([
      "function_declaration",
      "method_declaration",
      "type_declaration",
    ]),
  },
  ".java": {
    grammar: "tree-sitter-java",
    declarations: new Set([
      "method_declaration",
      "class_declaration",
      "enum_declaration",
      "interface_declaration",
      "constructor_declaration",
    ]),
  },
  ".rs": {
    grammar: "tree-sitter-rust",
    declarations: new Set([
      "function_item",
      "impl_item",
      "struct_item",
      "enum_item",
      "trait_item",
    ]),
  },
};

let parserInitialized = false;
const languageCache = new Map<string, Parser.Language>();

async function initParser(): Promise<void> {
  if (parserInitialized) return;
  await Parser.init();
  parserInitialized = true;
}

async function getLanguage(grammarName: string): Promise<Parser.Language> {
  const cached = languageCache.get(grammarName);
  if (cached) return cached;

  const wasmPath = require.resolve(`tree-sitter-wasms/out/${grammarName}.wasm`);
  const lang = await Parser.Language.load(wasmPath);
  languageCache.set(grammarName, lang);
  return lang;
}

function normalize(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*,\s*/g, ", ");
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function extractName(node: Parser.SyntaxNode): string | null {
  for (const child of node.children) {
    if (
      child.type === "identifier" ||
      child.type === "name" ||
      child.type === "type_identifier"
    ) {
      return child.text;
    }
    // For variable declarations like `const foo = ...`
    if (child.type === "variable_declarator") {
      return extractName(child);
    }
  }
  return null;
}

function extractSignature(node: Parser.SyntaxNode, ext: string): string | null {
  const type = node.type;

  // Type declarations (class, struct, enum, interface, trait)
  const typeKinds = [
    "class_declaration",
    "class_definition",
    "enum_declaration",
    "enum_item",
    "interface_declaration",
    "struct_declaration",
    "struct_item",
    "trait_item",
    "type_declaration",
  ];
  if (typeKinds.includes(type)) {
    const kind = type.replace(/_declaration|_definition|_item/g, "");
    const name = extractName(node);
    return name ? `${kind} ${name}` : null;
  }

  // Methods, functions, constructors
  const funcKinds = [
    "method_declaration",
    "method_definition",
    "function_declaration",
    "function_definition",
    "function_item",
    "constructor_declaration",
  ];
  if (funcKinds.includes(type)) {
    const name = extractName(node);
    if (!name) return null;

    const paramList = node.children.find(
      (c) =>
        c.type === "parameter_list" ||
        c.type === "formal_parameters" ||
        c.type === "parameters",
    );

    if (paramList) return normalize(`${name}${paramList.text}`);
    return `${name}()`;
  }

  // Property declarations (C#)
  if (type === "property_declaration") {
    const name = extractName(node);
    return name ? `property ${name}` : null;
  }

  // Arrow functions / lexical declarations (const foo = ...)
  if (type === "lexical_declaration" || type === "arrow_function") {
    if (type === "lexical_declaration") {
      const declarator = node.children.find(
        (c) => c.type === "variable_declarator",
      );
      if (!declarator) return null;
      const name = extractName(declarator);
      if (!name) return null;

      // Check if value is arrow function
      const value = declarator.children.find(
        (c) => c.type === "arrow_function",
      );
      if (!value) return null;

      const paramList = value.children.find(
        (c) => c.type === "formal_parameters",
      );
      if (paramList) return normalize(`${name}${paramList.text}`);
      return `${name}()`;
    }
    return null;
  }

  // Go impl blocks
  if (type === "impl_item") {
    const name = extractName(node);
    return name ? `impl ${name}` : null;
  }

  return null;
}

function* walkTree(node: Parser.SyntaxNode): Generator<Parser.SyntaxNode> {
  yield node;
  for (const child of node.children) {
    yield* walkTree(child);
  }
}

function findAllDeclarations(
  root: Parser.SyntaxNode,
  declarationTypes: Set<string>,
  ext: string,
): Array<{ signature: string; node: Parser.SyntaxNode }> {
  const results: Array<{ signature: string; node: Parser.SyntaxNode }> = [];
  for (const node of walkTree(root)) {
    if (declarationTypes.has(node.type)) {
      const sig = extractSignature(node, ext);
      if (sig) results.push({ signature: sig, node });
    }
  }
  return results;
}

export function getSupportedExtensions(): Set<string> {
  return new Set(Object.keys(LANG_CONFIG));
}

export async function findSymbolInSource(
  source: string,
  symbol: string,
  ext: string,
): Promise<SymbolInfo | null> {
  const config = LANG_CONFIG[ext];
  if (!config) return null;

  await initParser();
  const language = await getLanguage(config.grammar);
  const parser = new Parser();
  parser.setLanguage(language);

  const tree = parser.parse(source);
  const normalizedSymbol = normalize(symbol);
  const declarations = findAllDeclarations(
    tree.rootNode,
    config.declarations,
    ext,
  );

  for (const { signature, node } of declarations) {
    if (normalize(signature) === normalizedSymbol) {
      const body = source.slice(node.startIndex, node.endIndex);
      return {
        name: extractName(node) ?? signature,
        signature,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        contentHash: hashContent(body),
        body,
      };
    }
  }

  return null;
}

export async function findSymbolInFile(
  filePath: string,
  symbol: string,
): Promise<SymbolInfo | null> {
  const ext = path.extname(filePath);
  const source = await readFile(filePath, "utf-8");
  return findSymbolInSource(source, symbol, ext);
}

export async function computeContentHash(
  filePath: string,
  symbol: string,
): Promise<string | null> {
  const result = await findSymbolInFile(filePath, symbol);
  return result?.contentHash ?? null;
}

export async function getFileAtCommit(
  repoPath: string,
  commit: string,
  filePath: string,
): Promise<string | null> {
  try {
    const { stdout } = await exec("git", ["show", `${commit}:${filePath}`], {
      cwd: repoPath,
    });
    return stdout;
  } catch {
    return null;
  }
}

export async function listDeclarations(
  filePath: string,
): Promise<Array<{ signature: string; startLine: number; endLine: number }>> {
  const ext = path.extname(filePath);
  const config = LANG_CONFIG[ext];
  if (!config) return [];

  await initParser();
  const language = await getLanguage(config.grammar);
  const parser = new Parser();
  parser.setLanguage(language);

  const source = await readFile(filePath, "utf-8");
  const tree = parser.parse(source);
  const declarations = findAllDeclarations(
    tree.rootNode,
    config.declarations,
    ext,
  );

  return declarations.map(({ signature, node }) => ({
    signature,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  }));
}
