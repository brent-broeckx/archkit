export function toJsonl<T>(items: T[]): string {
  if (items.length === 0) {
    return ''
  }

  return `${items.map((item) => JSON.stringify(item)).join('\n')}\n`
}
