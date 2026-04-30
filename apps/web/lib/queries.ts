'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import type { Digest, UserPreferences } from '@astrodigest/shared'
import type { PaginatedDigests } from '@/lib/types'
import {
  getLatestDigest,
  getDigests,
  getDigest,
  updatePreferences,
  registerTokenGetter,
} from '@/lib/api'

export const queryKeys = {
  latestDigest: ['digest', 'latest'] as const,
  digests: (page: number) => ['digests', page] as const,
  digest: (id: string) => ['digest', id] as const,
  preferences: (userId: string) => ['preferences', userId] as const,
}

// Call once near the top of the app (inside ClerkProvider + QueryClientProvider).
// Wires Clerk's getToken into the axios interceptor for the session lifetime.
export function useClerkTokenSync(): void {
  const { getToken } = useAuth()
  useEffect(() => {
    registerTokenGetter(getToken)
  }, [getToken])
}

export function useLatestDigest(): UseQueryResult<Digest> {
  return useQuery({
    queryKey: queryKeys.latestDigest,
    queryFn: getLatestDigest,
    staleTime: 60 * 60 * 1000, // 1 hour — matches API cache TTL
  })
}

export function useDigests(page: number): UseQueryResult<PaginatedDigests> {
  return useQuery({
    queryKey: queryKeys.digests(page),
    queryFn: () => getDigests(page, 10),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

export function useDigest(id: string): UseQueryResult<Digest> {
  return useQuery({
    queryKey: queryKeys.digest(id),
    queryFn: () => getDigest(id),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — digests are immutable once published
    enabled: id.length > 0,
  })
}

interface SavePreferencesVariables {
  userId: string
  preferences: UserPreferences
}

interface MutationContext {
  previous: UserPreferences | undefined
  userId: string
}

export function useSavePreferences(): UseMutationResult<
  void,
  unknown,
  SavePreferencesVariables,
  MutationContext
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, preferences }) => updatePreferences(userId, preferences),

    onMutate: async ({ userId, preferences }) => {
      const key = queryKeys.preferences(userId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<UserPreferences>(key)
      queryClient.setQueryData<UserPreferences>(key, preferences)
      return { previous, userId }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.preferences(context.userId), context.previous)
      }
    },

    onSettled: (_data, _err, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.preferences(userId) })
    },
  })
}
