import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useAdminBranches() {
  const { data: branches } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => api.get('/branches/my-branches').then(res => res.data)
  })
  return branches || []
}