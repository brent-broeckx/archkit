# Arch

Arch is a local-first architecture engine for codebases.

It analyzes TypeScript and JavaScript repositories using deterministic static analysis and produces an architecture graph that can be queried by developers and tools.

## MVP focus

- TypeScript / JavaScript repositories
- deterministic AST-based analysis (no AI dependency)
- local execution
- fast graph generation

## Monorepo packages

- `@arch/core` — shared types and interfaces
- `@arch/parser-ts` — TypeScript parser and extraction scaffolding
- `@arch/graph` — graph storage and traversal scaffolding
- `@arch/context` — context compilation scaffolding
- `@arch/cli` — `arch` command scaffolding

## Quick start

```bash
pnpm install
pnpm build
pnpm --filter @arch/cli exec arch
```

## Commands

- `arch build` (implemented)
- `arch stats` (implemented)
- `arch query` (implemented)
- `arch deps`
- `arch show` (implemented)
- `arch context`

For full product requirements, see `MVP.md`.
