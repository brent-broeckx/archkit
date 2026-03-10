# @archkit/graph

Graph storage, indexing, and query utilities for Arch.

## What it does

- Persists graph data and metadata under .arch
- Loads persisted nodes, edges, and symbol indexes
- Resolves symbol input and dependency queries
- Stores and searches architecture knowledge entries

## Install

```bash
pnpm add @archkit/graph
```

## Quick usage

```ts
import { readGraphMeta, querySymbols } from '@archkit/graph'

const rootDir = process.cwd()
const meta = await readGraphMeta(rootDir)
const matches = await querySymbols(rootDir, 'ContextCompiler')

console.log(meta.symbols, matches.matches.length)
```

## See also

- Main project docs: ../../README.md
- Architecture notes: ../../ARCHITECTURE.md
