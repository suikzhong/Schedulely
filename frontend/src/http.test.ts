import { describe, expect, it, vi } from 'vitest'
import { fetchJson } from './http'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('fetchJson', () => {
  it('does not set content-type when POST body is empty', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchJson<{ ok: boolean }>('http://localhost:3001', '/admin/reset', {
      method: 'POST',
    })

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(options.method).toBe('POST')
    expect(options.headers).toBeUndefined()
  })

  it('sets JSON content-type when request has a body', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchJson<{ ok: boolean }>('http://localhost:3001', '/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Sui' }),
    })

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'content-type': 'application/json' })
  })

  it('throws backend error message for failed requests', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ error: 'Bad request' }, 400))
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      fetchJson<{ ok: boolean }>('http://localhost:3001', '/admin/reset', {
        method: 'POST',
      }),
    ).rejects.toThrow('Bad request')
  })
})
