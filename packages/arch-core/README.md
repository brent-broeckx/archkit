# @archkit/core

Shared core types for the Arch ecosystem.

## What it provides

- Node and edge model types used across Arch packages
- Graph container interfaces for parser and graph services
- Source location and metadata contracts

## Install

```bash
pnpm add @archkit/core
```

## Quick usage

```ts
import type { ArchNode, ArchEdge, GraphData } from '@archkit/core'

const node: ArchNode = {
  id: 'function:src/index.ts#run',
  type: 'function',
  name: 'run',
  filePath: 'src/index.ts',
  loc: { startLine: 1, endLine: 10 },
}

const graph: GraphData = { nodes: [node], edges: [] }
```

## See also

- Main project docs: ../../README.md
- Architecture notes: ../../ARCHITECTURE.md
