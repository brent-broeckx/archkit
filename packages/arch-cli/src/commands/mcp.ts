import { existsSync } from 'node:fs'
import path from 'node:path'
import { createMcpServer } from '@archkit/mcp'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError } from '../utils/command-output'

export interface McpOutputOptions extends OutputOptions {
  repoPath?: string
}

export async function executeMcpCommand(
  repoPath: string,
  cwd: string = process.cwd(),
): Promise<void> {
  if (!repoPath || repoPath.trim().length === 0) {
    throw new CliCommandError(
      'MCP_ROOT_REQUIRED',
      'Repository path is required. Run `arch mcp <repoPath>` with an explicit project root.',
    )
  }

  const rootDir = path.resolve(cwd, repoPath)

  if (!existsSync(rootDir)) {
    throw new CliCommandError('MCP_ROOT_NOT_FOUND', `Repository path not found: ${rootDir}`)
  }

  // Warn if .arch is not present since many MCP tools depend on it
  if (!existsSync(path.join(rootDir, '.arch'))) {
    // do not block startup — consumer might be initializing — but surface a clear message
    // Use console.warn so it surfaces in stdio logs
    // eslint-disable-next-line no-console
    console.warn('Warning: .arch directory not found in', rootDir)
  }

  try {
    // Ensure process runs from the repository root so any local binary resolution
    // (pnpm exec) and filesystem access is correct for MCP clients that cannot set cwd.
    process.chdir(rootDir)

    const server = createMcpServer({ rootDir })
    await server.start()
  } catch (error) {
    if (error instanceof Error) {
      throw new CliCommandError('MCP_SERVER_START_FAILED', error.message)
    }

    throw new CliCommandError('MCP_SERVER_START_FAILED', 'Failed to start MCP server.')
  }
}

export async function runMcpCommand(
  repoPath: string,
  outputOptions: McpOutputOptions = {},
): Promise<void> {
  try {
    await executeMcpCommand(repoPath, process.cwd())
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}

function resolveMcpRootDir(repoPath: string, cwd: string): string {
  const trimmedRepoPath = repoPath.trim()

  if (trimmedRepoPath.length > 0 && trimmedRepoPath !== '.') {
    return path.resolve(cwd, trimmedRepoPath)
  }

  // pnpm sets INIT_CWD to the directory where the command was launched.
  const initCwd = process.env.INIT_CWD
  if (initCwd && initCwd.trim().length > 0) {
    const fromInitCwd = detectProjectRoot(path.resolve(initCwd))
    if (fromInitCwd) {
      return fromInitCwd
    }
  }

  const fromCwd = detectProjectRoot(path.resolve(cwd))
  if (fromCwd) {
    return fromCwd
  }

  return path.resolve(cwd)
}

function detectProjectRoot(startDir: string): string | undefined {
  let currentDir = startDir
  let fallbackPackageDir: string | undefined

  while (true) {
    if (
      existsSync(path.join(currentDir, '.arch', 'graph', 'nodes.jsonl'))
      || existsSync(path.join(currentDir, '.arch'))
      || existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))
    ) {
      return currentDir
    }

    if (existsSync(path.join(currentDir, 'package.json'))) {
      fallbackPackageDir = currentDir
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      return fallbackPackageDir
    }

    currentDir = parentDir
  }
}
