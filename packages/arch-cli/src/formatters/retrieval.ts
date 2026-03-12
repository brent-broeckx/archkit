import type { QueryRetrievalMetadata, RetrievedItem } from '@archkit/graph'

export function formatRetrievalMetadataHuman(metadata: QueryRetrievalMetadata | undefined): string[] {
  if (!metadata) {
    return []
  }

  const lines = [
    'Retrieval',
    `  mode: ${metadata.mode}`,
    `  query type: ${metadata.queryType}`,
    `  deterministic confidence: ${metadata.deterministicConfidence}`,
    `  semantic used: ${metadata.semanticUsed ? 'yes' : 'no'}`,
  ]

  if (metadata.reason.length === 0) {
    lines.push('  reason: (none)')
  } else {
    lines.push('  reason:')
    metadata.reason.forEach((reason) => {
      lines.push(`    - ${reason}`)
    })
  }

  return lines
}

export function formatRetrievalMetadataLlm(metadata: QueryRetrievalMetadata | undefined): string[] {
  if (!metadata) {
    return ['- none']
  }

  const lines = [
    `- mode: ${metadata.mode}`,
    `- query type: ${metadata.queryType}`,
    `- deterministic confidence: ${metadata.deterministicConfidence}`,
    `- semantic used: ${metadata.semanticUsed ? 'yes' : 'no'}`,
  ]

  if (metadata.reason.length === 0) {
    lines.push('- reason: none')
  } else {
    metadata.reason.forEach((reason) => {
      lines.push(`- reason: ${reason}`)
    })
  }

  return lines
}

export function formatEvidenceInline(result: RetrievedItem): string {
  if (result.evidence.length === 0) {
    return 'no evidence'
  }

  return result.evidence
    .slice(0, 3)
    .map((evidence) => `${evidence.type}(${evidence.score})`)
    .join(', ')
}
