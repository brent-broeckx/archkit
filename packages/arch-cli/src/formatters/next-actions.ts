import type { NextAction } from '@archkit/graph'

export function formatNextActionsHuman(nextActions: NextAction[] | undefined): string[] {
  if (!nextActions || nextActions.length === 0) {
    return []
  }

  const lines = ['Recommended next steps']
  nextActions.forEach((action) => {
    lines.push(`  ${action.priority}. ${toCommandString(action)}`)
    lines.push(`     ${action.reason}`)
  })

  return lines
}

export function formatNextActionsLlm(nextActions: NextAction[] | undefined): string[] {
  if (!nextActions || nextActions.length === 0) {
    return []
  }

  const lines = ['## Recommended next steps']
  nextActions.forEach((action) => {
    lines.push(`- ${action.priority}. \`${toCommandString(action)}\``)
    lines.push(`  ${action.reason}`)
  })

  return lines
}

function toCommandString(action: NextAction): string {
  switch (action.tool) {
    case 'arch_show':
      return `arch show ${String(action.args.target ?? '')}`.trim()
    case 'arch_deps':
      return `arch deps ${String(action.args.target ?? '')}`.trim()
    case 'arch_context':
      return `arch context ${String(action.args.query ?? '')}`.trim()
    case 'arch_query':
      return `arch query ${String(action.args.query ?? '')}`.trim()
    default:
      return 'arch'
  }
}
