import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import api from '../api/axios'

function Notifications() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then(res => res.data)
  })

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications'])
  })

  return (
    <MainLayout>
      <h2 className="text-2xl font-bold mb-6">Notifications</h2>
      <div className="bg-white rounded-lg shadow divide-y">
        {isLoading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : notifications?.length === 0 ? (
          <p className="p-6 text-gray-500">No unread notifications</p>
        ) : (
          notifications?.map(n => (
            <div key={n.id} className={`p-4 flex justify-between items-start ${!n.is_read ? 'bg-blue-50' : ''}`}>
              <div>
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <button onClick={() => markRead.mutate(n.id)} className="text-xs text-blue-600 hover:underline ml-4 shrink-0">
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </MainLayout>
  )
}

export default Notifications