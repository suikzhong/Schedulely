export async function fetchJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const hasBody = typeof init?.body !== 'undefined'
  const res = await fetch(`${baseUrl}${path}`, {
    headers: hasBody ? { 'content-type': 'application/json' } : undefined,
    ...init,
  })

  const data = (await res.json()) as T & { error?: string }

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }

  return data
}
