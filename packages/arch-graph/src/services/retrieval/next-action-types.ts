import type {
  NextAction,
  NextActionAmbiguity,
  QueryRetrievalMetadata,
  RetrievedItem,
} from '../../models/retrieval-types'

export interface NextActionCandidate {
  action: Omit<NextAction, 'priority'>
  score: number
}

export interface BuildNextActionsInput {
  query: string
  command: 'query' | 'context'
  retrievalMetadata: QueryRetrievalMetadata
  results: RetrievedItem[]
  maxActions?: number
}

export interface BuildNextActionsOutput {
  nextActions: NextAction[]
  ambiguities: NextActionAmbiguity[]
}

export function clamp01(value: number): number {
  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

export function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  if (lastSlash < 0) {
    return path
  }

  return path.slice(0, lastSlash)
}

export function toActionKey(action: Omit<NextAction, 'priority'>): string {
  const args = JSON.stringify(
    Object.entries(action.args)
      .slice()
      .sort((left, right) => left[0].localeCompare(right[0])),
  )

  return `${action.tool}:${args}`
}
