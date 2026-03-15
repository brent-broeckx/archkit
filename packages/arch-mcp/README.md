# @archkit/mcp

Model Context Protocol (MCP) server for Arch.

Use this package when you want agents and IDE tools to call Arch as MCP tools over stdio.

## What this server provides

The Arch MCP server exposes these tools:

- `arch_context`
- `arch_query`
- `arch_show`
- `arch_deps`
- `arch_features`
- `arch_knowledge`

The server is started through the Arch CLI command; you must provide the repository root when launching:

```bash
arch mcp <repoPath>
```

## Prerequisites

- Node.js 18+
- `@archkit/cli` available globally, or in your project dependencies
- A repository with Arch data (`.arch/`), typically created with:

```bash
arch init
arch build
```

## IDE setup guides

### VS Code + GitHub Copilot MCP

Add this to your VS Code MCP configuration file (for example `mcp.json`):

```jsonc
{
	"servers": {
		"archkit-mcp": {
			"type": "stdio",
			"command": "pnpm",
			"args": ["exec", "arch", "mcp"]
		}
	},
	"inputs": []
}
```

If Arch is installed globally, you can use:

```jsonc
{
	"servers": {
		"archkit-mcp": {
			"type": "stdio",
			"command": "arch",
			"args": ["mcp"]
		}
	},
	"inputs": []
}
```

Notes:

- `pnpm exec` runs the local workspace binary reliably, even when the IDE process does not have global installs on `PATH`.
- `pnpm arch mcp` is often equivalent in an interactive shell, but `pnpm exec arch mcp` is the most explicit and portable form for config files.

### Claude Code MCP

Configure an MCP server entry that starts Arch over stdio.

Use local project binary via pnpm:

```json
{
	"name": "archkit-mcp",
	"type": "stdio",
	"command": "pnpm",
	"args": ["exec", "arch", "mcp"]
}
```

Or, if globally installed:

```json
{
	"name": "archkit-mcp",
	"type": "stdio",
	"command": "arch",
	"args": ["mcp"]
}
```

### Local agent setups (generic MCP clients)

For any local MCP client that supports stdio servers:

1. Set command to either `arch` (global install) or `pnpm` (local workspace).
2. Use args `mcp` for global Arch, or `exec arch mcp` for pnpm local invocation.
3. Start the client from your project root, or pass an explicit repo path (`arch mcp <repoPath>`).

## Root directory behavior

When started with `arch mcp` (without explicit `repoPath`), Arch resolves the project root automatically.

Detection order:

1. `INIT_CWD` (when provided by package managers like pnpm)
2. Current working directory
3. Upward search for project markers (`.arch/` or `pnpm-workspace.yaml`)
4. Fallback to nearest directory with `package.json`

This allows global configurations to work across repositories, as long as the MCP client launches in the intended project folder.


## Quick test

Run this in the repository you want to query and provide the repo root explicitly:

```bash
arch init
arch build
arch mcp .
```

Then call a tool from your MCP client, for example `arch_context` with:

```json
{
	"query": "how dependencies are persisted"
}
```

## Troubleshooting

- If the client cannot start the server, verify the command exists (`arch --version` or `pnpm exec arch --version`).
- If tool calls fail with missing graph/index files, run `arch build` in that repository first.
- If the server points to the wrong repository, either:
	- start the client from the correct project root, or
	- pass an explicit path: `arch mcp /path/to/repo`.
