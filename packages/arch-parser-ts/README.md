# @archkit/parser-ts

Deterministic TypeScript/JavaScript parser for Arch.

## What it does

- Discovers source files in a repository
- Builds symbol and file nodes from AST data
- Extracts import and call edges
- Returns stable, sorted graph data

## Install

```bash
pnpm add @archkit/parser-ts
```

## Quick usage

```ts
import { TypeScriptParser } from '@archkit/parser-ts'

const parser = new TypeScriptParser()
const graph = parser.parseRepository({ rootDir: process.cwd() })

console.log(graph.nodes.length, graph.edges.length)
```

## See also

- Main project docs: ../../README.md
- Architecture notes: ../../ARCHITECTURE.md
