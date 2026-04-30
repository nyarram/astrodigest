import axios, { type AxiosError, type AxiosInstance } from 'axios'
import type { Digest, UserPreferences, User } from '@astrodigest/shared'
import type { ApiError, PaginatedDigests, RegisterPayload } from '@/lib/types'

// Populated by registerTokenGetter() called from useClerkTokenSync() in queries.ts.
// Kept at module scope so the axios interceptor can reach it without React context.
type TokenGetter = () => Promise<string | null>
let _getToken: TokenGetter | null = null

export function registerTokenGetter(fn: TokenGetter): void {
  _getToken = fn
}

const client: AxiosInstance = axios.create({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(async (config) => {
  if (_getToken !== null) {
    const token = await _getToken()
    if (token !== null) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const data = error.response?.data as Record<string, unknown> | undefined
    const code = typeof data?.['code'] === 'string' ? data['code'] : undefined
    const apiError: ApiError = {
      message:
        typeof data?.['message'] === 'string'
          ? data['message']
          : error.message || 'An unexpected error occurred',
      status: error.response?.status ?? 0,
      ...(code !== undefined ? { code } : {}),
    }
    return Promise.reject(apiError)
  },
)

export async function getLatestDigest(): Promise<Digest> {
  const { data } = await client.get<Digest>('/digests/latest')
  return data
}

export async function getDigests(page: number, limit: number): Promise<PaginatedDigests> {
  const { data } = await client.get<PaginatedDigests>('/digests', {
    params: { page, limit },
  })
  return data
}

export async function getDigest(id: string): Promise<Digest> {
  const { data } = await client.get<Digest>(`/digests/${id}`)
  return data
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const { data } = await client.post<User>('/users/register', payload)
  return data
}

export async function updatePreferences(userId: string, prefs: UserPreferences): Promise<void> {
  await client.put(`/users/${userId}/preferences`, prefs)
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await client.post(`/users/${userId}/push-token`, { token })
}
