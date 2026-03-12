# Arch — MVP Specification

## Overview

Arch is a local architecture engine for codebases.

It analyzes a repository, constructs a structural graph of the system, and allows developers or AI tools to query that graph to understand dependencies, flows, and relevant code snippets.

Arch focuses on deterministic code analysis, not AI inference. AI is optional and never required to use Arch.

## Core Principles

Arch must follow these principles:

1. Deterministic Architecture Analysis

   - Arch must extract architecture using:
     - AST parsing
     - static analysis
     - dependency graphs
   - It must never rely on AI to analyze code.

2. Local-First

   - Arch must run fully locally.
   - Requirements:
     - no API keys
     - no internet connection required
     - no cloud services
   - Users should be able to run `arch build` on any repository.

3. Fast Execution

   - Arch should feel instantaneous.
   - Target performance:

     | Repo Size | Target Build Time |
     | --- | --- |
     | 10k LOC | < 1s |
     | 50k LOC | < 3s |
     | 100k LOC | < 8s |

   - Performance matters more than deep analysis in the MVP.

4. Deterministic Output

   - Arch should always produce the same graph for the same code.
   - No heuristics based on:
     - embeddings
     - AI
     - semantic guesses

5. AI-Ready Output

   - Arch should generate context that AI tools can consume easily.
   - But Arch itself should not be an AI tool.

## MVP Scope

- Focus: TypeScript / JavaScript repositories.
- Supported languages:
  - TypeScript
  - JavaScript
- Future support may include Python, Go, Rust — but the MVP must focus on TypeScript.

## High Level Architecture

Arch has three main systems arranged as a pipeline:

Repository → AST Parser → Architecture Graph → Query Engine → Context Compiler

### Repository Graph Model

The architecture graph consists of:

- Nodes
- Edges

### Node Types

The following node types are supported in MVP:

- `file` — source file
- `class` — class definition
- `method` — class method
- `function` — standalone function
- `interface` — interface definition
- `type` — type definition
- `route` — http route

### Node Schema

Each node has the following structure:

```ts
interface ArchNode {
  id: string
  type: NodeType
  name: string
  filePath: string
  loc: {
    startLine: number
    endLine: number
    startOffset?: number
    endOffset?: number
  }

  exported?: boolean
  signature?: string
}
```

Example:

```json
{
  "id": "method:src/auth/AuthService.ts#login",
  "type": "method",
  "name": "login",
  "filePath": "src/auth/AuthService.ts",
  "loc": {
    "startLine": 12,
    "endLine": 48
  }
}
```

### Edge Types

Edges describe relationships between nodes.

Supported edge types:

- `contains` — file contains symbol
- `imports` — file imports file
- `calls` — function/method calls function
- `extends` — class extends class
- `implements` — class implements interface
- `references` — symbol references another symbol

Edge schema:

```ts
interface ArchEdge {
  from: string
  to: string
  type: EdgeType
  filePath?: string
  loc?: {
    startLine: number
    endLine: number
  }
}
```

Example:

```json
{
  "from": "method:AuthController.login",
  "to": "method:AuthService.login",
  "type": "calls"
}
```

## Directory Structure

Arch stores generated data in `.arch`:

```
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

### JSONL Format

Nodes and edges use JSONL.

Example:

```
{"id":"class:AuthService","type":"class"}
{"id":"method:AuthService.login","type":"method"}
```

Advantages:

- appendable
- diffable
- fast to parse

## CLI Commands

The MVP provides six commands:

- `arch build`
- `arch stats`
- `arch query`
- `arch deps`
- `arch show`
- `arch context`

### `arch build`

Builds the architecture graph.

Example:

```
Scanning repository...

Files scanned: 182
Symbols extracted: 621
Edges created: 1842

Graph saved to .arch/graph
```

### `arch stats`

Displays architecture statistics.

Example:

```
Repository Architecture

Files: 182
Symbols: 621
Edges: 1842

Symbol Types
  classes: 44
  methods: 279
  functions: 128
```

### `arch query`

Search for symbols.

Example:

```
arch query AuthService

Matches

class src/auth/AuthService.ts#AuthService

methods
  AuthService.login
  AuthService.logout
```

### `arch deps`

Show dependencies for a symbol.

Example:

```
arch deps AuthService

Imports
  JwtService
  UserRepository

Calls
  JwtService.generateToken
```

### `arch show`

Display a symbol snippet.

Example:

```
arch show AuthService.login

src/auth/AuthService.ts:12-48

async login(email: string, password: string) {
  ...
}
```

### `arch context`

Compile context for a feature or symbol.

Example:

```
arch context authentication

Authentication Flow

AuthController.login
  → AuthService.login
  → JwtService.generateToken
```

## Output Modes and Formatters

Arch commands must support multiple output modes so the same core architecture query can be consumed by different systems.

### Purpose

Arch is not only a terminal tool.
It must also be usable by:

- scripts
- IDE integrations
- agent/tool integrations
- LLM workflows

Because of that, command results must be renderable in multiple formats.

### Supported Output Modes

Every command that returns structured data should support these output modes where applicable.

#### 1. Human-readable terminal output

Default mode.

This is optimized for developers running Arch directly in the CLI.

Example:

```
arch context authentication
```

Output:

```
Context: authentication

Entrypoints
  AuthController.login

Flow
  AuthController.login
    → AuthService.login
      → JwtService.generateToken

Files
  src/auth/AuthController.ts
  src/auth/AuthService.ts
  src/auth/JwtService.ts
```

#### 2. JSON output

Machine-readable mode.

This is intended for:

- scripts
- IDE plugins
- CI tooling
- custom agents
- future Arch server mode

Example:

```
arch context authentication --json
```

Output:

```json
{
  "query": "authentication",
  "entrypoints": ["AuthController.login"],
  "files": [
    "src/auth/AuthController.ts",
    "src/auth/AuthService.ts",
    "src/auth/JwtService.ts"
  ],
  "paths": [
    [
      "AuthController.login",
      "AuthService.login",
      "JwtService.generateToken"
    ]
  ]
}
```

#### 3. LLM markdown output

Markdown output optimized for use with LLM tools.

This is intended for:

- ChatGPT
- Claude
- Cursor chat
- local LLM tools
- copy/paste into prompts

Example:

```
arch context authentication --format llm
```

Output:

```markdown
# Authentication Architecture

## Entrypoint
AuthController.login()

## Flow
AuthController.login → AuthService.login → JwtService.generateToken

## Relevant Files
- src/auth/AuthController.ts
- src/auth/AuthService.ts
- src/auth/JwtService.ts

## Key Snippets
...
```

This mode must be concise, structured, and optimized for prompt quality.

### Output Design Rule

Commands must separate:

- query execution
- result rendering

This means the internal logic should first produce a structured result object, and then pass it to an output formatter.

Example pipeline:

```
command
  ↓
query engine
  ↓
structured result object
  ↓
formatter
  ├─ terminal formatter
  ├─ json formatter
  └─ llm formatter
```

This keeps Arch clean and extensible.

### Commands That Must Support Output Modes

The following commands should support multiple output modes.

| Command | Human | JSON | LLM |
| --- | --- | --- | --- |
| `arch build` | yes | yes | no |
| `arch stats` | yes | yes | no |
| `arch query` | yes | yes | optional |
| `arch deps` | yes | yes | optional |
| `arch show` | yes | yes | yes |
| `arch context` | yes | yes | yes |

Notes:

- `build` and `stats` do not need LLM formatting in MVP
- `context` is the highest priority for LLM formatting
- `show` may also benefit from LLM formatting
- `query` and `deps` can add LLM formatting later if useful

### CLI Flag Rules

#### JSON output

Use:

```
--json
```

This should always output valid JSON only, with no extra log lines.

Bad:

```
Scanning repository...
{ ...json... }
```

Good:

```
{ ...json... }
```

This is important so scripts and agents can parse output safely.

#### Format output

Use:

```
--format <value>
```

Supported values in MVP:

- `human`
- `llm`

Rules:

- default format is `human`
- `--json` takes precedence over `--format`
- `--format llm` outputs markdown
- `--format human` is equivalent to default CLI output

Examples:

```
arch context authentication
arch context authentication --format human
arch context authentication --format llm
arch context authentication --json
```

### Formatter Architecture

Create a formatter layer in the project.

Suggested package/module location:

- `packages/arch-core/src/output/`
  or
- `packages/arch-cli/src/formatters/`

Preferred design:

- command handlers return typed result objects
- formatters are pure functions
- formatters do not perform graph queries
- formatters only transform result objects into output strings or JSON

Example concept:

```ts
type OutputMode = "human" | "json" | "llm"
```

Example formatter API:

```ts
formatContextResult(result, "human")
formatContextResult(result, "json")
formatContextResult(result, "llm")
```

### Result Object Contracts

Every command should produce a typed internal result object before rendering.

Context result:

```ts
interface ContextResult {
  query: string
  entrypoints: string[]
  files: string[]
  paths: string[][]
  snippets: Array<{
    nodeId: string
    file: string
    symbol: string
    startLine: number
    endLine: number
    code?: string
    reason?: string
  }>
}
```

Query result:

```ts
interface QueryResult {
  term: string
  matches: Array<{
    nodeId: string
    type: string
    name: string
    file: string
  }>
}
```

Deps result:

```ts
interface DepsResult {
  symbol: string
  imports: string[]
  calls: string[]
  callers: string[]
}
```

This ensures consistent rendering across output modes.

### LLM Output Best Practices

LLM output must be:

- markdown
- concise
- structured with headings
- deterministic
- free of terminal decoration
- free of ANSI colors
- optimized to reduce token waste

LLM output should prioritize:

- entrypoints
- dependency flow
- relevant files
- minimal snippets

LLM output must not dump entire files unless explicitly requested.

### JSON Output Best Practices

JSON output must be:

- stable
- typed
- parseable
- deterministic
- free of log noise

JSON field names should remain consistent across versions whenever possible.

If breaking changes are introduced later, Arch should version output contracts.

### Human Output Best Practices

Human output should be:

- readable in terminal
- concise
- easy to scan
- friendly for debugging

Human output may use:

- indentation
- section headers
- arrows for flow

Human output must not be the only supported mode for structured commands.

## Context Compiler

The context compiler returns:

- entrypoints
- dependency paths
- relevant files
- code snippets

Example JSON:

```json
{
  "query": "authentication",
  "entrypoints": ["AuthController.login"],
  "files": [
    "src/auth/AuthController.ts",
    "src/auth/AuthService.ts",
    "src/auth/JwtService.ts"
  ],
  "paths": [
    [
      "AuthController.login",
      "AuthService.login",
      "JwtService.generateToken"
    ]
  ]
}
```

### Snippet Extraction

Snippets are extracted via AST node location.

Steps:

1. Identify relevant nodes
2. Retrieve node location
3. Extract source text
4. Include minimal surrounding context

Example snippet:

```json
{
  "file": "src/auth/AuthService.ts",
  "symbol": "AuthService.login",
  "startLine": 12,
  "endLine": 48
}
```

## AST Parser

Arch uses `ts-morph`.

Parser responsibilities:

- load project
- parse source files
- extract symbols
- extract imports
- detect calls
- record node locations

Parser Pipeline:

source files → AST parsing → symbol extraction → relationship extraction → node + edge creation

### Snippet Selection Rules

Context bundles should remain small. Limits:

- max snippets: 8
- max files: 6
- max lines: 300

## What Arch Will NOT Include

These features are explicitly excluded from MVP.

### No AI inside Arch

Arch must not:

- call OpenAI
- require API keys
- generate AI summaries

AI integration can be added later as optional plugins.

### No Vector Databases

Arch must not include:

- embeddings
- semantic search
- vector storage

Architecture graphs replace this.

### No Cloud Services

Arch must never depend on:

- remote APIs
- hosted services

### No heavy IDE integration in MVP

IDE plugins are future work.

## Roadmap

Phase 1 — Graph Engine

Features:

- file discovery
- AST parsing
- symbol extraction
- import edges
- contains edges

Commands:

- `arch build`
- `arch stats`

Phase 2 — Symbol Queries

Features:

- node lookup
- snippet extraction

Commands:

- `arch query`
- `arch show`

Phase 3 — Dependency Analysis

Features:

- call detection
- dependency traversal

Commands:

- `arch deps`

Phase 4 — Context Compiler

Features:

- query scoring
- graph expansion
- snippet selection

Commands:

- `arch context`

Phase 5 — Output Modes and Formatters

Features:

- typed result interfaces for each command
- command handlers return result objects instead of printing directly
- formatter layer with pure functions
- human output formatter for structured commands
- `--json` support for structured commands
- `--format llm` for `arch context`
- `--format llm` for `arch show`
- tests for formatter outputs

Implementation order:

1. define typed result interfaces for each command
2. make command handlers return result objects instead of printing directly
3. build human formatter
4. add `--json`
5. add `--format llm` for `arch context`
6. add `--format llm` for `arch show`
7. add tests for all formatter outputs


Phase 6 — Architecture Knowledge Layer

Goal:

Introduce a structured local architecture knowledge system that allows developers to store and retrieve important codebase information such as:

- architectural decisions
- workarounds
- caveats
- migration notes
- feature-specific documentation

This knowledge complements the architecture graph and allows Arch to capture why things exist, not just how they are connected.

The knowledge layer must remain:

- local
- structured
- deterministic
- optional for users

It must not introduce AI requirements.

Motivation:

The architecture graph describes structural relationships in code:

- which services call other services
- which modules depend on each other
- which routes trigger which flows

However, the graph cannot answer questions like:

- Why does this workaround exist?
- Why was this architecture decision made?
- Why must this module not be refactored?
- Why does this feature use a specific implementation?

Developers often know these answers but they are lost in:

- Slack threads
- GitHub issues
- PR discussions
- tribal knowledge

The knowledge layer provides a structured local place to store that information.

Example use cases:

1. Workaround

```bash
arch knowledge add \
  --type workaround \
  --feature authentication \
  --title "OIDC clock skew issue" \
  --body "Allow 2 minute skew because some client machines had incorrect system time."
```

2. Architecture decision

```bash
arch knowledge add \
  --type decision \
  --feature payments \
  --title "Use retry for payment gateway calls" \
  --body "Gateway occasionally returns transient errors. Retry with exponential backoff."
```

3. Migration note

```bash
arch knowledge add \
  --type migration \
  --feature billing \
  --title "Stripe API v1 deprecation" \
  --body "All calls should migrate to Stripe v2 endpoints before Q4."
```

Commands:

The knowledge system introduces a new command group:

- `arch knowledge`

Supported commands:

- `arch knowledge add`
- `arch knowledge list`
- `arch knowledge show`
- `arch knowledge search`

Command details:

`arch knowledge add`

Example:

```bash
arch knowledge add \
  --type workaround \
  --feature authentication \
  --title "OIDC clock skew issue" \
  --body "Allow 2 minute skew because some client machines had incorrect system time."
```

Required fields:

- `type`
- `title`
- `body`

Optional fields:

- `feature`
- `tags`

`arch knowledge list`

Example output:

```text
Knowledge Entries

authentication
  oidc-clock-skew-workaround

billing
  stripe-v2-migration

general
  pnpm-workspace-decision
```

`arch knowledge show <id>`

Example:

```bash
arch knowledge show oidc-clock-skew-workaround
```

Example output:

```text
Title: OIDC clock skew issue
Type: workaround
Feature: authentication

Client machines sometimes had incorrect system time.
Allow a 2 minute clock skew during token validation.
```

`arch knowledge search <query>`

Example:

```bash
arch knowledge search "clock skew"
```

Example output:

```text
Matches

oidc-clock-skew-workaround
Feature: authentication
Type: workaround
```

Knowledge storage:

All knowledge must be stored locally under:

- `.arch/knowledge/`

Recommended structure:

```text
.arch/
  knowledge/
    index.json
    entries/
      authentication/
        2026-03-10_oidc-clock-skew-workaround.md
      billing/
        2026-03-10_stripe-v2-migration.md
      general/
        2026-03-10_pnpm-workspace-decision.md
```

Knowledge entry format:

Entries must be stored as Markdown files with metadata.

Example:

```markdown
---
id: oidc-clock-skew-workaround
title: OIDC clock skew issue
type: workaround
feature: authentication
tags:
  - oidc
  - auth
createdAt: 2026-03-10
---

Client machines sometimes had incorrect system time which caused JWT tokens to appear issued in the future.

Solution:
Allow a 2 minute skew in validation.
```

Metadata fields:

Each entry includes:

| Field | Description |
| --- | --- |
| `id` | unique identifier |
| `title` | short description |
| `type` | knowledge type |
| `feature` | optional feature grouping |
| `tags` | optional tags |
| `createdAt` | creation date |

Supported knowledge types:

The MVP should support the following types:

- `decision`
- `workaround`
- `caveat`
- `note`
- `migration`

These provide enough structure without overcomplicating the system.

Knowledge index:

Arch should maintain a small index file for fast lookups.

Example:

- `.arch/knowledge/index.json`

Example structure:

```json
{
  "entries": [
    {
      "id": "oidc-clock-skew-workaround",
      "type": "workaround",
      "feature": "authentication",
      "file": "entries/authentication/2026-03-10_oidc-clock-skew-workaround.md"
    }
  ]
}
```

Integration with Arch queries:

In later phases the knowledge system may integrate with graph queries.

Example:

```bash
arch context authentication --include-knowledge
```

Possible output:

```text
Authentication Flow

AuthController.login
 -> AuthService.login
 -> JwtService.generateToken

Knowledge Notes

OIDC clock skew workaround
Allow 2 minute skew during validation.
```

This allows context bundles to include human knowledge alongside architecture data.

Design principles:

The knowledge system must follow these rules.

Structured data:

Knowledge entries must always contain metadata fields.

Free-form notes without structure must not be supported.

Local storage:

All knowledge must remain inside the repository under `.arch`.

Arch must not rely on:

- cloud services
- remote APIs
- external databases

Deterministic behavior:

Knowledge retrieval must rely on:

- keyword search
- tag filtering
- feature filtering

Semantic search or embeddings are not part of the MVP.

Human-readable format:

Knowledge must be stored in Markdown so developers can:

- read entries directly
- edit entries manually if needed
- commit entries to Git

Phase 7 - Dead Code Detection
Goal:

1. Identify functions, methods, classes, and files that are never referenced anywhere in the architecture graph.
2. This helps developers clean up codebases and also helps AI agents avoid touching irrelevant code.
3. Since Arch already builds a full symbol graph, this feature becomes surprisingly straightforward.

### How it Works

After arch build, the graph contains:
- nodes (symbols)
- edges (calls, imports, references)

Dead code is simply:
- nodes with zero incoming edges (excluding entrypoints)

Example graph:

AuthController.login → AuthService.login → JwtService.generateToken

If another function exists:
createLegacyToken()

And no nodes reference it:
incoming edges = 0

Then it is dead code.

Algorithm:

- Iterate all symbol nodes.
- Ignore certain categories:
  1. entrypoints (routes, CLI commands)
  2. exported public APIs (configurable)
  3. framework-required exports

Check:
incomingEdges(symbol) === 0

If true → candidate dead code.

### CLI
arch dead-code

Example output:

Dead Code Detected

Functions
  createLegacyToken
  generateOldInvoice

Classes
  LegacyPaymentProcessor

Files
  src/legacy/auth.ts
JSON Mode
arch dead-code --json

Example:

{
  "functions": ["createLegacyToken"],
  "classes": ["LegacyPaymentProcessor"],
  "files": ["src/legacy/auth.ts"]
}

### Why This Helps AI

AI agents frequently waste context on:
- unused utilities
- deprecated modules
- experimental code

Dead code detection allows AI systems to ignore irrelevant files.

This reduces context dramatically.


Phase 8 — Programmatic Consumption

Possible features:

- `arch serve`
- local HTTP API
- MCP/server adapter
- SDK wrapper for agents and IDEs

This phase depends on the output contracts from Phase 5.

Phase 9 — Optional AI Integrations

Possible future features:

- AI explanation layer
- MCP server
- IDE plugins

But the core should remain:

- fast
- local
- deterministic

Phase 9 — Context Limits Configuration

Features:

- configurable context limits for `arch context`
- CLI overrides for limits such as snippets, files, lines, depth, and paths
- optional project-level defaults via local config
- deterministic fallback to built-in defaults when no overrides are provided

Commands:

- `arch context <query> --max-snippets <n> --max-files <n> --max-lines <n>`

## Package Architecture

```
packages/
  arch-cli
  arch-core
  arch-parser-ts
  arch-graph
  arch-context
```

### Module Responsibilities

- `arch-parser-ts`: AST parsing and symbol extraction.
- `arch-graph`: Graph storage and traversal.
- `arch-context`: Context compilation.
- `arch-cli`: Command line interface.

## Best Practices

- Keep the graph simple — complex graph models reduce performance.
- Prefer fewer node types and fewer edge types.
- Deterministic logic only — avoid heuristics that could change results between runs.
- Avoid framework-specific assumptions — do not hardcode patterns for React, Angular, NestJS.
- The graph should be framework-agnostic.
- Prefer readability over cleverness — Arch should be easy to maintain and extend.

## MVP Success Criteria

The MVP is successful if Arch can correctly handle:

- `arch build`
- `arch query AuthService`
- `arch deps AuthService`
- `arch context authentication`

on a typical TypeScript backend repository.

## Long Term Vision

Arch becomes the architecture engine for AI coding tools.

Possible integrations:

- local AI assistants
- IDE plugins
- automated code analysis
- architectural visualization

But the core should remain:

- fast
- local
- deterministic
