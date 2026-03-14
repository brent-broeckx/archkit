import { describe, expect, it } from 'vitest'
import {
  formatEvidenceInline,
  formatRetrievalMetadataHuman,
  formatRetrievalMetadataLlm,
} from '../src/formatters/retrieval'

describe('retrieval formatter', () => {
  it('formats metadata for human and llm with and without reasons', () => {
    expect(formatRetrievalMetadataHuman(undefined)).toEqual([])
    expect(formatRetrievalMetadataLlm(undefined)).toEqual(['- none'])

    const metadata = {
      query: 'auth',
      mode: 'hybrid' as const,
      queryType: 'conceptual' as const,
      deterministicConfidence: 0.42,
      lexicalUsed: true,
      semanticUsed: true,
      reason: ['no exact symbol match'],
    }

    const human = formatRetrievalMetadataHuman(metadata)
    const llm = formatRetrievalMetadataLlm(metadata)

    expect(human.join('\n')).toContain('mode: hybrid')
    expect(human.join('\n')).toContain('lexical used: yes')
    expect(human.join('\n')).toContain('reason:')
    expect(llm.join('\n')).toContain('- reason: no exact symbol match')

    const noReason = formatRetrievalMetadataLlm({ ...metadata, reason: [] })
    expect(noReason).toContain('- reason: none')
  })

  it('formats evidence inline', () => {
    expect(
      formatEvidenceInline({
        id: 'a',
        kind: 'symbol',
        name: 'A',
        path: 'src/a.ts',
        nodeIds: ['a'],
        score: 1,
        deterministicScore: 1,
        scoreBreakdown: {
          exactScore: 1,
          featureScore: 0,
          graphScore: 0,
          lexicalScore: 0,
          semanticScore: 0,
          totalScore: 1,
        },
        evidence: [],
      }),
    ).toBe('no evidence')

    const inline = formatEvidenceInline({
      id: 'a',
      kind: 'symbol',
      name: 'A',
      path: 'src/a.ts',
      nodeIds: ['a'],
      score: 10,
      deterministicScore: 10,
      scoreBreakdown: {
        exactScore: 10,
        featureScore: 0,
        graphScore: 0,
        lexicalScore: 0,
        semanticScore: 0,
        totalScore: 10,
      },
      evidence: [
        { type: 'exact_symbol_match', value: 'A', score: 10, source: 'deterministic' as const },
        { type: 'token_match', value: '1', score: 5, source: 'deterministic' as const },
      ],
    })

    expect(inline).toContain('exact_symbol_match(10)')
    expect(inline).toContain('token_match(5)')
  })
})
