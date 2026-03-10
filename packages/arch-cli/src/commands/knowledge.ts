import {
  KNOWLEDGE_TYPES,
  addKnowledgeEntry,
  getKnowledgeEntry,
  listKnowledgeEntries,
  searchKnowledgeEntries,
  type KnowledgeType,
} from '@archkit/graph'
import { formatKnowledgeResult } from '../formatters/knowledge'
import type {
  KnowledgeAddCommandResult,
  KnowledgeListCommandResult,
  KnowledgeSearchCommandResult,
  KnowledgeShowCommandResult,
} from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export interface KnowledgeAddOptions extends OutputOptions {
  type?: string
  title?: string
  body?: string
  feature?: string
  tags?: string
}

export async function executeKnowledgeAddCommand(
  options: KnowledgeAddOptions,
  cwd: string = process.cwd(),
): Promise<KnowledgeAddCommandResult> {
  const normalizedType = options.type?.trim().toLocaleLowerCase()
  const title = options.title?.trim()
  const body = options.body?.trim()

  if (!normalizedType || !title || !body) {
    throw new CliCommandError(
      'INVALID_INPUT',
      'Provide type, title, and body. Usage: `arch knowledge add --type <type> --title <title> --body <body>`.',
    )
  }

  if (!isKnowledgeType(normalizedType)) {
    throw new CliCommandError(
      'INVALID_INPUT',
      `Invalid type: ${normalizedType}. Supported values: ${KNOWLEDGE_TYPES.join(', ')}.`,
    )
  }

  const parsedTags = parseTagsOption(options.tags)

  try {
    const entry = await addKnowledgeEntry(cwd, {
      type: normalizedType,
      title,
      body,
      feature: options.feature,
      tags: parsedTags,
    })

    return {
      action: 'add',
      entry,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new CliCommandError('KNOWLEDGE_EXISTS', error.message)
    }

    throw new CliCommandError('COMMAND_FAILED', 'Failed to add knowledge entry.')
  }
}

export async function executeKnowledgeListCommand(
  cwd: string = process.cwd(),
): Promise<KnowledgeListCommandResult> {
  try {
    const entries = await listKnowledgeEntries(cwd)
    return {
      action: 'list',
      entries,
    }
  } catch {
    throw new CliCommandError('COMMAND_FAILED', 'Failed to list knowledge entries.')
  }
}

export async function executeKnowledgeShowCommand(
  id: string | undefined,
  cwd: string = process.cwd(),
): Promise<KnowledgeShowCommandResult> {
  const normalizedId = id?.trim().toLocaleLowerCase()
  if (!normalizedId) {
    throw new CliCommandError('INVALID_INPUT', 'Provide an entry id. Usage: `arch knowledge show <id>`.')
  }

  try {
    const entry = await getKnowledgeEntry(cwd, normalizedId)
    if (!entry) {
      throw new CliCommandError('KNOWLEDGE_NOT_FOUND', `No knowledge entry found for id: ${normalizedId}`)
    }

    return {
      action: 'show',
      entry,
    }
  } catch (error) {
    if (error instanceof CliCommandError) {
      throw error
    }

    throw new CliCommandError('COMMAND_FAILED', 'Failed to load knowledge entry.')
  }
}

export async function executeKnowledgeSearchCommand(
  query: string | undefined,
  cwd: string = process.cwd(),
): Promise<KnowledgeSearchCommandResult> {
  const normalizedQuery = query?.trim()
  if (!normalizedQuery) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a query. Usage: `arch knowledge search <query>`.')
  }

  try {
    const matches = await searchKnowledgeEntries(cwd, normalizedQuery)
    return {
      action: 'search',
      query: normalizedQuery,
      matches,
    }
  } catch {
    throw new CliCommandError('COMMAND_FAILED', 'Failed to search knowledge entries.')
  }
}

export async function runKnowledgeAddCommand(options: KnowledgeAddOptions): Promise<void> {
  try {
    const mode = resolveOutputMode(options, true)
    const result = await executeKnowledgeAddCommand(options)
    writeFormattedOutput(formatKnowledgeResult(result, mode))
  } catch (error) {
    handleCommandError(error, options)
  }
}

export async function runKnowledgeListCommand(options: OutputOptions): Promise<void> {
  try {
    const mode = resolveOutputMode(options, true)
    const result = await executeKnowledgeListCommand()
    writeFormattedOutput(formatKnowledgeResult(result, mode))
  } catch (error) {
    handleCommandError(error, options)
  }
}

export async function runKnowledgeShowCommand(
  id: string | undefined,
  options: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(options, true)
    const result = await executeKnowledgeShowCommand(id)
    writeFormattedOutput(formatKnowledgeResult(result, mode))
  } catch (error) {
    handleCommandError(error, options)
  }
}

export async function runKnowledgeSearchCommand(
  query: string | undefined,
  options: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(options, true)
    const result = await executeKnowledgeSearchCommand(query)
    writeFormattedOutput(formatKnowledgeResult(result, mode))
  } catch (error) {
    handleCommandError(error, options)
  }
}

function isKnowledgeType(value: string): value is KnowledgeType {
  return KNOWLEDGE_TYPES.includes(value as KnowledgeType)
}

function parseTagsOption(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}
