import type { RetrievalMode } from '@archkit/graph'
import { CliCommandError } from './command-output'

const VALID_MODES: RetrievalMode[] = ['exact', 'lexical', 'hybrid', 'semantic']

export const COMMAND_DEFAULT_RETRIEVAL_MODE = {
  show: 'exact',
  deps: 'exact',
  context: 'hybrid',
  query: 'hybrid',
} as const satisfies Record<string, RetrievalMode>

export function resolveRetrievalMode(
  value: string | undefined,
  fallback: RetrievalMode,
): RetrievalMode {
  if (!value || value.trim().length === 0) {
    return fallback
  }

  const mode = value.trim().toLocaleLowerCase() as RetrievalMode
  if (!VALID_MODES.includes(mode)) {
    throw new CliCommandError(
      'INVALID_INPUT',
      'Invalid retrieval mode. Supported values: exact, lexical, hybrid, semantic.',
    )
  }

  return mode
}
