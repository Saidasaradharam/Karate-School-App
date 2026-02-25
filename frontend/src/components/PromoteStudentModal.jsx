import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

function PromoteStudentModal({ onClose, showToast }) {
  const queryClient = useQueryClient()
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [search, setSearch] = useState('')

  const { data: students } = useQuery({
    queryKey: ['branch-students-promote'],
    queryFn: () => api.get('/students/').then(res => res.data)
  })

  const promote = useMutation({
    mutationFn: (user_id) => api.post('/admins/promote', { user_id }),
    onSuccess: () => {
      showToast('Student promoted to admin successfully')
      queryClient.invalidateQueries(['students'])
      onClose()
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to promote', 'error')
  })

  const filtered = students?.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="font-bold text-lg mb-1">Promote to Admin</h3>
        <p className="text-sm text-gray-500 mb-4">Select a student from your branch to promote</p>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-3"
        />

        <div className="border rounded-xl max-h-56 overflow-y-auto mb-4">
          {filtered?.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedStudent(s)}
              className={`px-4 py-3 cursor-pointer border-b last:border-0 hover:bg-gray-50 flex justify-between items-center ${
                selectedStudent?.id === s.id ? 'bg-gray-50 border-l-4 border-l-gray-900' : ''
              }`}
            >
              <div>
                <p className="font-medium text-sm">{s.full_name}</p>
                <p className="text-xs text-gray-400">{s.belt_grade}</p>
              </div>
              {selectedStudent?.id === s.id && (
                <span className="text-xs font-semibold text-gray-900">Selected ✓</span>
              )}
            </div>
          ))}
          {filtered?.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">No students found</p>
          )}
        </div>

        {selectedStudent && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ <strong>{selectedStudent.full_name}</strong> will be promoted to admin for your branch. This cannot be undone easily.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => promote.mutate(selectedStudent.user_id)}
            disabled={!selectedStudent || promote.isPending}
            className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {promote.isPending ? 'Promoting...' : 'Promote to Admin'}
          </button>
          <button onClick={onClose} className="flex-1 border py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default PromoteStudentModal