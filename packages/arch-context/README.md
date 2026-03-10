# @archkit/context

Context compilation for Arch.

## What it does

- Ranks relevant symbols for a query
- Expands related call/import paths
- Selects bounded snippets and files for context sharing
- Produces deterministic context bundles

## Install

```bash
pnpm add @archkit/context
```

## Quick usage

```ts
import { ContextCompiler } from '@archkit/context'

const compiler = new ContextCompiler()
const bundle = await compiler.compile(process.cwd(), { query: 'authentication' })

console.log(bundle.entrypoints)
```

## See also

- Main project docs: ../../README.md
- Architecture notes: ../../ARCHITECTURE.md
