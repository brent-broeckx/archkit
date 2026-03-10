import path from 'node:path'
import type { AddKnowledgeInput, KnowledgeEntry, KnowledgeEntrySummary, KnowledgeType } from '../models/knowledge-types'

const FRONTMATTER_SEPARATOR = '---'

export function normalizeFeature(input: string | undefined): string {
  const normalized = (input ?? 'general').trim().toLocaleLowerCase()
  const slugged = slugify(normalized)
  return slugged.length > 0 ? slugged : 'general'
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) {
    return []
  }

  const cleaned = tags
    .map((tag) => slugify(tag))
    .filter((tag) => tag.length > 0)

  return [...new Set(cleaned)].sort((left, right) => left.localeCompare(right))
}

export function toKnowledgeId(title: string): string {
  const id = slugify(title)
  return id.length > 0 ? id : 'entry'
}

export function toCreatedAtDate(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  return new Date().toISOString().slice(0, 10)
}

export function toEntryRelativeFile(feature: string, createdAt: string, id: string): string {
  return path.posix.join('entries', feature, `${createdAt}_${id}.md`)
}

export function serializeKnowledgeEntry(entry: KnowledgeEntry): string {
  const lines = [
    FRONTMATTER_SEPARATOR,
    `id: ${entry.id}`,
    `title: ${entry.title}`,
    `type: ${entry.type}`,
    `feature: ${entry.feature}`,
  ]

  if (entry.tags.length > 0) {
    lines.push('tags:')
    entry.tags.forEach((tag) => {
      lines.push(`  - ${tag}`)
    })
  }

  lines.push(`createdAt: ${entry.createdAt}`, FRONTMATTER_SEPARATOR, '', entry.body)
  return `${lines.join('\n')}\n`
}

export function parseKnowledgeEntry(content: string, file: string): KnowledgeEntry {
  const lines = content.split(/\r?\n/)
  if (lines.length < 3 || lines[0].trim() !== FRONTMATTER_SEPARATOR) {
    throw new Error(`Invalid knowledge entry frontmatter in ${file}`)
  }

  let separatorIndex = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === FRONTMATTER_SEPARATOR) {
      separatorIndex = index
      break
    }
  }

  if (separatorIndex < 0) {
    throw new Error(`Invalid knowledge entry frontmatter in ${file}`)
  }

  let id = ''
  let title = ''
  let type: KnowledgeType | undefined
  let feature = 'general'
  const tags: string[] = []
  let createdAt = ''

  for (let index = 1; index < separatorIndex; index += 1) {
    const line = lines[index]
    const trimmedLine = line.trim()

    if (trimmedLine.length === 0) {
      continue
    }

    if (trimmedLine === 'tags:') {
      for (let tagIndex = index + 1; tagIndex < separatorIndex; tagIndex += 1) {
        const tagLine = lines[tagIndex].trim()
        if (!tagLine.startsWith('- ')) {
          break
        }

        const tag = slugify(tagLine.slice(2))
        if (tag.length > 0) {
          tags.push(tag)
        }
        index = tagIndex
      }
      continue
    }

    const splitIndex = line.indexOf(':')
    if (splitIndex < 0) {
      continue
    }

    const key = line.slice(0, splitIndex).trim()
    const value = line.slice(splitIndex + 1).trim()

    if (key === 'id') {
      id = value
    } else if (key === 'title') {
      title = value
    } else if (key === 'type' && isKnowledgeType(value)) {
      type = value
    } else if (key === 'feature') {
      feature = normalizeFeature(value)
    } else if (key === 'createdAt') {
      createdAt = value
    }
  }

  if (id.length === 0 || title.length === 0 || !type || createdAt.length === 0) {
    throw new Error(`Missing required metadata in knowledge entry ${file}`)
  }

  const body = lines.slice(separatorIndex + 1).join('\n').trim()

  return {
    id,
    title,
    type,
    feature,
    tags: normalizeTags(tags),
    createdAt,
    file,
    body,
  }
}

export function toSummary(entry: KnowledgeEntry): KnowledgeEntrySummary {
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    feature: entry.feature,
    tags: [...entry.tags],
    createdAt: entry.createdAt,
    file: entry.file,
  }
}

export function normalizeAddInput(input: AddKnowledgeInput): Omit<KnowledgeEntry, 'file'> {
  return {
    id: toKnowledgeId(input.title),
    title: input.title.trim(),
    type: input.type,
    feature: normalizeFeature(input.feature),
    tags: normalizeTags(input.tags),
    createdAt: toCreatedAtDate(input.createdAt),
    body: input.body.trim(),
  }
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function isKnowledgeType(value: string): value is KnowledgeType {
  return (
    value === 'decision'
    || value === 'workaround'
    || value === 'caveat'
    || value === 'note'
    || value === 'migration'
  )
}
