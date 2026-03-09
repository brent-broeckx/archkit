# Arch Architecture (MVP)

## 1) System Architecture

Arch uses a deterministic local pipeline:

Repository  
↓  
AST Parser (arch-parser-ts)  
↓  
Architecture Graph (arch-graph)  
↓  
Query Engine  
↓  
Context Compiler (arch-context)  
↓  
CLI (arch-cli)

Design constraints:

- deterministic output for identical source input
- local-first operation (no cloud dependency)
- TypeScript-first in MVP
- no AI, embeddings, or vector search in core workflow

## Code Organization Standard

To keep Arch readable and maintainable, implementation must use a modular folder structure.

Required conventions:

- do not implement large features in a single source file
- split code by responsibility into focused directories such as `models`, `services`, `utils`, and `commands` (for CLI)
- keep modules small, cohesive, and easy to navigate
- keep package entrypoints (`src/index.ts`) thin and focused on exports/composition
- prefer clear naming and explicit boundaries over dense multi-purpose files

This standard applies to all packages and future phases.

## 2) Graph Model

Architecture is represented by typed nodes and typed edges.

### Node Types

- `file`
- `class`
- `method`
- `function`
- `interface`
- `type`
- `route`

### Edge Types

- `contains`
- `imports`
- `calls`
- `extends`
- `implements`
- `references`

### Node Schema

```ts
interface SourceLoc {
  startLine: number
  endLine: number
  startOffset?: number
  endOffset?: number
}

interface ArchNode {
  id: string
  type: NodeType
  name: string
  filePath: string
  loc: SourceLoc
  exported?: boolean
  signature?: string
}
```

### Edge Schema

```ts
interface ArchEdge {
  from: string
  to: string
  type: EdgeType
  filePath?: string
  loc?: SourceLoc
}
```

### Storage Shape

Generated data is persisted under `.arch`:

```text
.arch/
  graph/
    nodes.jsonl
    edges.jsonl
    graph-meta.json
  index/
    symbols.json
    files.json
  contexts/
```

## 3) Package Responsibilities

- `@arch/core`
  - shared schemas and core types (`ArchNode`, `ArchEdge`, `SourceLoc`)
- `@arch/parser-ts`
  - `ts-morph` project loading
  - TypeScript/JavaScript file discovery scaffolding
  - extraction scaffolding for symbols and dependency relationships
- `@arch/graph`
  - graph storage, indexing, and traversal helpers
- `@arch/context`
  - context bundle assembly and formatting scaffold
- `@arch/cli`
  - command surface for `build`, `stats`, `query`, `deps`, `show`, `context`

## 4) Data Flow

1. Parser loads repository source files.
2. Parser emits deterministic `nodes` + `edges`.
3. Graph package stores and indexes entities for traversal.
4. Query operations resolve symbols and dependency paths.
5. Context compiler selects relevant files/snippets for output.
6. CLI orchestrates the flow and prints deterministic results.

## Context Bundle Format (MVP)

```ts
interface ContextBundle {
  query: string
  entrypoints: string[]
  files: string[]
  paths: string[][]
  snippets: Array<{
    file: string
    symbol: string
    startLine: number
    endLine: number
  }>
}
```

Limits for context selection in MVP:

- max snippets: 8
- max files: 6
- max lines: 300
