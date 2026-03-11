const REGEX_ESCAPE_PATTERN = /[.+^${}()|[\]\\]/g

export function normalizeFeatureName(input: string): string {
  const normalized = input.trim().toLocaleLowerCase()
  const slugged = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return slugged.length > 0 ? slugged : 'general'
}

export function normalizePattern(input: string): string {
  const trimmed = input.trim().replaceAll('\\', '/')
  if (trimmed.length === 0) {
    return ''
  }

  const withoutPrefix = trimmed.startsWith('./') ? trimmed.slice(2) : trimmed
  return withoutPrefix.replace(/\/+/g, '/')
}

export function normalizeFilePath(input: string): string {
  return normalizePattern(input)
}

export function matchesPattern(filePath: string, pattern: string): boolean {
  if (pattern.length === 0) {
    return false
  }

  return globToRegExp(pattern).test(filePath)
}

function globToRegExp(pattern: string): RegExp {
  let expression = '^'

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]

    if (char === '*') {
      const nextChar = pattern[index + 1]
      if (nextChar === '*') {
        expression += '.*'
        index += 1
      } else {
        expression += '[^/]*'
      }
      continue
    }

    expression += char.replace(REGEX_ESCAPE_PATTERN, '\\$&')
  }

  expression += '$'
  return new RegExp(expression)
}
