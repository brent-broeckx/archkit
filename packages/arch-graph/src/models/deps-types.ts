import type { NextAction, NextActionAmbiguity } from './retrieval-types'

export interface DepsResult {
  input: string
  resolvedNodeIds: string[]
  imports: string[]
  calls: string[]
  callers: string[]
  nextActions?: NextAction[]
  ambiguities?: NextActionAmbiguity[]
}
