export type ProposalStatus = 'valid' | 'conflicted'

export interface User {
  id: string
  name: string
  email: string
  timezone: string
  outlookHtmlUrl: string
  calendarFileName?: string
  calendarFileContent?: string
  createdAt: string
  lastImportAt?: string
}

export interface AvailabilityBlock {
  id: string
  userId: string
  startAt: string
  endAt: string
  status: 'busy'
  sourceUpdatedAt: string
}

export interface SharedSpace {
  id: string
  name: string
  ownerUserId: string
  createdAt: string
}

export interface SharedSpaceMember {
  id: string
  spaceId: string
  userId: string
}

export interface MeetingProposal {
  id: string
  spaceId: string
  proposerUserId: string
  startAt: string
  endAt: string
  status: ProposalStatus
  conflictingUserIds: string[]
  alternativeSlots: string[]
  createdAt: string
}

export interface ImportLog {
  id: string
  userId: string
  runAt: string
  status: 'success' | 'error'
  message: string
}

export interface Database {
  users: User[]
  availabilityBlocks: AvailabilityBlock[]
  sharedSpaces: SharedSpace[]
  sharedSpaceMembers: SharedSpaceMember[]
  proposals: MeetingProposal[]
  importLogs: ImportLog[]
}

export interface OverlapSuggestion {
  startAt: string
  endAt: string
  availableCount: number
  totalCount: number
  state: 'all_available' | 'some_conflicts' | 'no_overlap'
  conflictingUserIds: string[]
}
