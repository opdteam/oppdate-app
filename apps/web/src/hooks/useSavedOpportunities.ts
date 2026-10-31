import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const QUERY_KEY = ['savedOpportunities']

async function fetchSavedIds(): Promise<string[]> {
  const res = await api.get<{ success: boolean; data: Array<{ opportunityId: string }> }>(
    '/api/v1/saved-opportunities'
  )
  return res.data.data.map((s) => s.opportunityId)
}

export function useSavedOpportunities() {
  const client = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSavedIds,
  })

  const savedIds = query.data ?? []
  const savedSet = new Set(savedIds)

  const mutation = useMutation({
    mutationFn: async ({ id, wasSaved }: { id: string; wasSaved: boolean }) => {
      if (wasSaved) {
        await api.delete(`/api/v1/saved-opportunities/${id}`)
      } else {
        await api.post(`/api/v1/saved-opportunities/${id}`)
      }
    },
    onMutate: async ({ id, wasSaved }) => {
      await client.cancelQueries({ queryKey: QUERY_KEY })
      const previous = client.getQueryData<string[]>(QUERY_KEY)

      client.setQueryData<string[]>(QUERY_KEY, (old = []) =>
        wasSaved ? old.filter((x) => x !== id) : [...old, id]
      )

      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        client.setQueryData(QUERY_KEY, ctx.previous)
      }
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  function toggleSave(id: string) {
    mutation.mutate({ id, wasSaved: savedSet.has(id) })
  }

  return {
    savedSet,
    toggleSave,
    isLoading: query.isLoading,
  }
}
