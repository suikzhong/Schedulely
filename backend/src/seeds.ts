import { randomUUID } from 'node:crypto'
import type { AvailabilityBlock, Database, User } from './types.js'

function toIso(date: Date): string {
  return new Date(date.getTime()).toISOString()
}

function nextDate(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + dayOffset)
  d.setUTCHours(hour, minute, 0, 0)
  return d
}

function seededBusyBlocksForUser(userId: string, now: Date, variant: number): AvailabilityBlock[] {
  const slots = [
    { day: 1, start: 15, end: 16 },
    { day: 2, start: 18, end: 19 },
    { day: 3, start: 14, end: 15 },
    { day: 4, start: 20, end: 21 },
    { day: 6, start: 16, end: 17 },
  ]

  return slots.map((slot, idx) => {
    const start = nextDate(now, slot.day + variant, slot.start)
    const end = nextDate(now, slot.day + variant, slot.end)

    return {
      id: randomUUID(),
      userId,
      startAt: toIso(start),
      endAt: toIso(end),
      status: 'busy',
      sourceUpdatedAt: toIso(now),
    }
  })
}

export function seedDemoDataIfEmpty(db: Database): void {
  if (db.users.length > 0) {
    return
  }

  const now = new Date()
  const teammates: Array<Pick<User, 'name' | 'email' | 'timezone' | 'outlookHtmlUrl'>> = [
    {
      name: 'Teammate One',
      email: 'teammate1@example.com',
      timezone: 'America/New_York',
      outlookHtmlUrl: 'https://outlook.office.com/calendar/published/example1.html',
    },
    {
      name: 'Teammate Two',
      email: 'teammate2@example.com',
      timezone: 'America/New_York',
      outlookHtmlUrl: 'https://outlook.office.com/calendar/published/example2.html',
    },
    {
      name: 'Teammate Three',
      email: 'teammate3@example.com',
      timezone: 'America/New_York',
      outlookHtmlUrl: 'https://outlook.office.com/calendar/published/example3.html',
    },
  ]

  const users: User[] = teammates.map((teammate) => ({
    id: randomUUID(),
    ...teammate,
    createdAt: now.toISOString(),
    lastImportAt: now.toISOString(),
  }))

  db.users.push(...users)

  users.forEach((user, idx) => {
    db.availabilityBlocks.push(...seededBusyBlocksForUser(user.id, now, idx))
  })
}
