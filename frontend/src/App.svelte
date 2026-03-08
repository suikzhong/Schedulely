<script lang="ts">
  import { fetchJson as requestJson } from './http'

  type User = {
    id: string
    name: string
    email: string
    timezone: string
    outlookHtmlUrl: string
    calendarFileName?: string
    lastImportAt?: string
  }

  type AvailabilityBlock = {
    id: string
    userId: string
    startAt: string
    endAt: string
    status: 'busy'
  }

  type Space = {
    id: string
    name: string
    ownerUserId: string
  }

  type Suggestion = {
    startAt: string
    endAt: string
    availableCount: number
    totalCount: number
    state: 'all_available' | 'some_conflicts' | 'no_overlap'
    conflictingUserIds: string[]
  }

  type Proposal = {
    id: string
    status: 'valid' | 'conflicted'
    conflictingUserIds: string[]
    alternativeSlots: string[]
    startAt: string
    endAt: string
  }

  const API_BASE = 'http://localhost:3001'

  let name = ''
  let email = ''
  let timezone = 'America/New_York'
  let outlookHtmlUrl = ''
  let calendarFile: File | null = null

  let durationMin = 60
  let spaceName = 'PM Team Demo'

  let loading = false
  let error = ''
  let success = ''

  let currentUser: User | null = null
  let users: User[] = []
  let availability: AvailabilityBlock[] = []

  let createdSpace: Space | null = null
  let selectedMemberIds: string[] = []
  let suggestions: Suggestion[] = []
  let proposalResult: Proposal | null = null

  const fmt = (iso: string): string =>
    new Date(iso).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  function clearAlerts() {
    error = ''
    success = ''
  }

  async function resetDatabase() {
    const confirmed = window.confirm('Erase all data and reseed demo users/calendars?')
    if (!confirmed) {
      return
    }

    clearAlerts()
    loading = true

    try {
      const result = await requestJson<{ ok: boolean; reseededUsers?: number }>(API_BASE, '/admin/reset', { method: 'POST' })

      name = ''
      email = ''
      timezone = 'America/New_York'
      outlookHtmlUrl = ''
      calendarFile = null
      durationMin = 60
      spaceName = 'PM Team Demo'
      currentUser = null
      users = []
      availability = []
      createdSpace = null
      selectedMemberIds = []
      suggestions = []
      proposalResult = null
      const usersData = await requestJson<{ users: User[] }>(API_BASE, '/users')
      users = usersData.users
      success = `Database reset. Demo users reseeded: ${result.reseededUsers ?? users.length}.`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to reset database'
    } finally {
      loading = false
    }
  }

  async function loadUsers() {
    const data = await requestJson<{ users: User[] }>(API_BASE, '/users')
    users = data.users

    if (currentUser) {
      selectedMemberIds = users
        .filter((u) => u.id !== currentUser?.id)
        .slice(0, 2)
        .map((u) => u.id)
    }
  }

  async function loadAvailability(userId: string) {
    const data = await requestJson<{ user: User; blocks: AvailabilityBlock[] }>(API_BASE, `/users/${userId}/availability`)
    availability = data.blocks
    currentUser = data.user
  }

  async function createUserAndImport() {
    clearAlerts()
    loading = true

    try {
      let calendarFileContent: string | undefined
      let calendarFileName: string | undefined

      if (calendarFile) {
        calendarFileContent = await calendarFile.text()
        calendarFileName = calendarFile.name
      }

      const created = await requestJson<{ user: User }>(API_BASE, '/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          timezone,
          outlookHtmlUrl: outlookHtmlUrl.trim(),
          calendarFileName,
          calendarFileContent,
        }),
      })

      currentUser = created.user

      const imported = await requestJson<{ importedCount: number }>(API_BASE, `/users/${created.user.id}/import`, {
        method: 'POST',
      })

      await loadAvailability(created.user.id)
      await loadUsers()

      success = `Onboarded and imported ${imported.importedCount} busy blocks.`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to onboard'
    } finally {
      loading = false
    }
  }

  function onFileSelected(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    calendarFile = input.files?.[0] ?? null
  }

  async function refreshImport() {
    if (!currentUser) return

    clearAlerts()
    loading = true

    try {
      const imported = await requestJson<{ importedCount: number }>(API_BASE, `/users/${currentUser.id}/import`, {
        method: 'POST',
      })
      await loadAvailability(currentUser.id)
      success = `Imported ${imported.importedCount} busy blocks.`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Import failed'
    } finally {
      loading = false
    }
  }

  function toggleMember(userId: string) {
    if (selectedMemberIds.includes(userId)) {
      selectedMemberIds = selectedMemberIds.filter((id) => id !== userId)
      return
    }

    selectedMemberIds = [...selectedMemberIds, userId]
  }

  async function createSpace() {
    clearAlerts()
    loading = true

    try {
      const ownerUserId = currentUser?.id ?? selectedMemberIds[0]
      if (!ownerUserId) {
        throw new Error('Select users or onboard first')
      }

      if (!currentUser && selectedMemberIds.length < 2) {
        throw new Error('Select at least 2 users to create a space')
      }

      const payload = {
        name: spaceName,
        ownerUserId,
        memberUserIds: currentUser ? selectedMemberIds : selectedMemberIds.slice(1),
      }

      const data = await requestJson<{ space: Space }>(API_BASE, '/spaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      createdSpace = data.space
      success = `Created space: ${data.space.name}`
      await loadOverlap()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create space'
    } finally {
      loading = false
    }
  }

  async function loadOverlap() {
    if (!createdSpace) return

    clearAlerts()
    loading = true

    try {
      const data = await requestJson<{ suggestions: Suggestion[] }>(
        API_BASE,
        `/spaces/${createdSpace.id}/overlap?durationMin=${durationMin}&days=14`,
      )
      suggestions = data.suggestions
      success = `Loaded ${suggestions.length} suggested slots.`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load overlap'
    } finally {
      loading = false
    }
  }

  async function propose(startAt: string, endAt: string) {
    if (!createdSpace) return

    clearAlerts()
    loading = true

    try {
      const proposerUserId = currentUser?.id ?? createdSpace.ownerUserId
      if (!proposerUserId) {
        throw new Error('No proposer user available')
      }

      const data = await requestJson<{ proposal: Proposal }>(API_BASE, `/spaces/${createdSpace.id}/proposals`, {
        method: 'POST',
        body: JSON.stringify({
          proposerUserId,
          startAt,
          endAt,
        }),
      })

      proposalResult = data.proposal
      success = `Proposal status: ${data.proposal.status}`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to propose time'
    } finally {
      loading = false
    }
  }

  function clearProposalResult() {
    proposalResult = null
  }

  loadUsers()
</script>

<main class="h-screen overflow-hidden bg-[#F0F3F1] p-4 lg:p-6">
  <div class="mx-auto flex h-full max-w-6xl min-h-0 flex-col">
    <div class="mb-4 flex shrink-0 items-center justify-between gap-3">
      <div class="flex items-center">
        <img
          src="/sch-logo.png"
          alt="Schedulely logo"
          class="h-36 w-auto max-w-[52vw] rounded-md object-contain lg:max-w-[20rem]"
        />
      </div>
      <div class="hidden flex-1 lg:block"></div>
      <button class="btn btn-error btn-outline" on:click={resetDatabase} disabled={loading}>
        Reset Database
      </button>
    </div>

    <div class="grid flex-1 min-h-0 gap-6 lg:grid-cols-3">
      <section class="card bg-base-100 shadow min-h-0 lg:h-full">
        <div class="card-body min-h-0 overflow-auto">
        <h2 class="card-title">1. Onboarding</h2>
        <label class="form-control">
          <span class="label-text">Name</span>
          <input class="input input-bordered" bind:value={name} placeholder="Sui" />
        </label>
        <label class="form-control">
          <span class="label-text">Email</span>
          <input class="input input-bordered" bind:value={email} placeholder="sui@example.com" />
        </label>
        <label class="form-control">
          <span class="label-text">Timezone</span>
          <input class="input input-bordered" bind:value={timezone} />
        </label>
        <label class="form-control">
          <span class="label-text">Published calendar URL (HTML or ICS)</span>
          <input class="input input-bordered" bind:value={outlookHtmlUrl} placeholder="https://outlook.office.com/... or .../calendar.ics" />
        </label>
        <label class="form-control">
          <span class="label-text">Or upload calendar file (.ics/.html)</span>
          <input class="file-input file-input-bordered" type="file" accept=".ics,.html,.htm,text/calendar,text/html" on:change={onFileSelected} />
        </label>
        {#if calendarFile}
          <div class="text-sm opacity-80">Selected file: {calendarFile.name}</div>
        {/if}
        <button class="btn btn-brand-blue" on:click={createUserAndImport} disabled={loading}>
          Create user + import
        </button>
        {#if currentUser}
          <div class="text-sm opacity-80">Current user: {currentUser.name} ({currentUser.email})</div>
        {/if}
        </div>
      </section>

      <section class="card bg-base-100 shadow min-h-0 lg:h-full">
        <div class="card-body h-full min-h-0">
          <div class="flex items-center justify-between gap-2">
            <h2 class="card-title">2. Personal Availability</h2>
            <button class="btn btn-sm" on:click={refreshImport} disabled={!currentUser || loading}>Refresh import</button>
          </div>

          <div class="grid h-full min-h-0 gap-4 lg:grid-rows-[1fr_1fr]">
            <div class="rounded-lg border border-base-300 p-3 min-h-0 overflow-auto">
              {#if availability.length === 0}
                <p class="text-sm opacity-70">No busy blocks yet.</p>
              {:else}
                <table class="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Start</th>
                      <th>End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each availability as block (block.id)}
                      <tr>
                        <td>{fmt(block.startAt)}</td>
                        <td>{fmt(block.endAt)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}
            </div>

            <div class="rounded-lg border border-base-300 p-3 min-h-0 overflow-auto bg-base-200/40">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">Proposal Result</h3>
                {#if proposalResult}
                  <button class="btn btn-xs" on:click={clearProposalResult}>Clear</button>
                {/if}
              </div>

              {#if proposalResult}
                <div
                  class="alert mt-3"
                  class:proposal-valid={proposalResult.status === 'valid'}
                  class:alert-warning={proposalResult.status === 'conflicted'}
                >
                  <div>
                    <div class="font-semibold">Proposal {proposalResult.status}</div>
                    <div class="text-sm mt-1">{fmt(proposalResult.startAt)} - {fmt(proposalResult.endAt)}</div>
                    {#if proposalResult.conflictingUserIds.length > 0}
                      <div class="text-sm mt-1">Conflicts: {proposalResult.conflictingUserIds.length} member(s)</div>
                    {/if}
                    {#if proposalResult.alternativeSlots.length > 0}
                      <div class="text-sm mt-1">
                        Alternatives: {proposalResult.alternativeSlots.map((slot) => fmt(slot)).join(' | ')}
                      </div>
                    {/if}
                  </div>
                </div>
              {:else}
                <p class="text-sm opacity-70 mt-3">No proposal submitted yet.</p>
              {/if}
            </div>
          </div>
        </div>
      </section>

      <section class="card bg-base-100 shadow min-h-0 lg:h-full">
        <div class="card-body h-full min-h-0">
          <h2 class="card-title">3. Shared Space + Suggestions</h2>

          <div class="grid h-full min-h-0 gap-4 lg:grid-rows-[320px_1fr]">
            <div class="rounded-lg border border-base-300 p-3 min-h-0">
              <div class="grid h-full min-h-0 gap-3 lg:grid-rows-[auto_auto_auto_1fr]">
                <label class="form-control">
                  <span class="label-text">Space name</span>
                  <input class="input input-bordered" bind:value={spaceName} />
                </label>

                <label class="form-control max-w-28">
                  <span class="label-text">Duration</span>
                  <select class="select select-bordered" bind:value={durationMin}>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </label>

                <div class="flex gap-2">
                  <button
                    class="btn btn-brand-green"
                    on:click={createSpace}
                    disabled={(loading || (!currentUser && selectedMemberIds.length < 2))}
                  >
                    Create space
                  </button>
                  <button class="btn" on:click={loadOverlap} disabled={!createdSpace || loading}>Refresh overlap</button>
                </div>

                {#if currentUser}
                  <div class="text-xs opacity-80">
                    Owner (auto-included in members): {currentUser.name}
                  </div>
                {:else if selectedMemberIds.length > 0}
                  <div class="text-xs opacity-80">
                    Owner (auto-included in members): {users.find((u) => u.id === selectedMemberIds[0])?.name ?? 'First selected user'}
                  </div>
                {/if}

                <div class="min-h-0 overflow-auto rounded-lg border border-base-300 p-2">
                  <div class="mb-2 text-sm font-medium">Members</div>
                  <div class="space-y-2">
                    {#each users.filter((u) => u.id !== currentUser?.id) as user (user.id)}
                      <label class="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          class="checkbox checkbox-sm"
                          checked={selectedMemberIds.includes(user.id)}
                          on:change={() => toggleMember(user.id)}
                        />
                        <span class="label-text">{user.name}</span>
                      </label>
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-base-300 p-3 min-h-0 overflow-auto bg-base-200/30">
              <h3 class="font-semibold">Proposal Slots</h3>
              {#if suggestions.length === 0}
                <p class="text-sm opacity-70 mt-3">No suggestions yet.</p>
              {:else}
                <div class="space-y-2 mt-3">
                  {#each suggestions as suggestion}
                    <div class="rounded-lg border border-base-300 p-3">
                      <div class="font-medium">{fmt(suggestion.startAt)} - {fmt(suggestion.endAt)}</div>
                      <div class="text-sm opacity-80">
                        {suggestion.availableCount}/{suggestion.totalCount} available ({suggestion.state})
                      </div>
                      <button class="btn btn-xs mt-2" on:click={() => propose(suggestion.startAt, suggestion.endAt)}>
                        Propose this slot
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  {#if error}
    <div class="toast toast-end">
      <div class="alert alert-error"><span>{error}</span></div>
    </div>
  {/if}

  {#if success}
    <div class="toast toast-start">
      <div class="alert alert-success"><span>{success}</span></div>
    </div>
  {/if}
</main>
