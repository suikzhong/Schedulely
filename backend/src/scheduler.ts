import type { AvailabilityBlock, OverlapSuggestion, User } from './types.js'

interface WindowInput {
  start: Date
  end: Date
}

function intersects(block: AvailabilityBlock, start: Date, end: Date): boolean {
  const blockStart = new Date(block.startAt)
  const blockEnd = new Date(block.endAt)
  return blockStart < end && blockEnd > start
}

function suggestionState(availableCount: number, totalCount: number): OverlapSuggestion['state'] {
  if (availableCount === totalCount) {
    return 'all_available'
  }
  if (availableCount === 0) {
    return 'no_overlap'
  }
  return 'some_conflicts'
}

export function computeSuggestions(params: {
  users: User[]
  availabilityBlocks: AvailabilityBlock[]
  durationMin: number
  window: WindowInput
  limit?: number
}): OverlapSuggestion[] {
  const { users, availabilityBlocks, durationMin, window, limit = 3 } = params
  const stepMs = 30 * 60 * 1000
  const durationMs = durationMin * 60 * 1000

  const perUserBlocks = new Map<string, AvailabilityBlock[]>()
  users.forEach((user) => {
    perUserBlocks.set(
      user.id,
      availabilityBlocks
        .filter((block) => block.userId === user.id)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    )
  })

  const candidates: OverlapSuggestion[] = []

  for (let ts = window.start.getTime(); ts + durationMs <= window.end.getTime(); ts += stepMs) {
    const start = new Date(ts)
    const end = new Date(ts + durationMs)

    // Keep demo suggestions inside common meeting hours.
    const utcHour = start.getUTCHours()
    if (utcHour < 12 || utcHour > 23) {
      continue
    }

    const conflictingUserIds: string[] = []

    users.forEach((user) => {
      const userBlocks = perUserBlocks.get(user.id) ?? []
      const hasConflict = userBlocks.some((block) => intersects(block, start, end))
      if (hasConflict) {
        conflictingUserIds.push(user.id)
      }
    })

    const availableCount = users.length - conflictingUserIds.length

    candidates.push({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      availableCount,
      totalCount: users.length,
      state: suggestionState(availableCount, users.length),
      conflictingUserIds,
    })
  }

  return candidates
    .sort((a, b) => {
      if (b.availableCount !== a.availableCount) {
        return b.availableCount - a.availableCount
      }
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    })
    .slice(0, limit)
}

export function findProposalConflict(params: {
  users: User[]
  availabilityBlocks: AvailabilityBlock[]
  startAt: string
  endAt: string
}): { conflictingUserIds: string[]; status: 'valid' | 'conflicted' } {
  const { users, availabilityBlocks, startAt, endAt } = params
  const start = new Date(startAt)
  const end = new Date(endAt)

  const conflictingUserIds = users
    .filter((user) => {
      const blocks = availabilityBlocks.filter((block) => block.userId === user.id)
      return blocks.some((block) => intersects(block, start, end))
    })
    .map((user) => user.id)

  return {
    conflictingUserIds,
    status: conflictingUserIds.length === 0 ? 'valid' : 'conflicted',
  }
}
