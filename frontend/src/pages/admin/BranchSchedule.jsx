import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import api from '../../api/axios'

const DAYS = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 },
]

function BranchSchedule() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const [selectedDays, setSelectedDays] = useState([])

  const { data: currentSchedule, isLoading } = useQuery({
    queryKey: ['my-schedule'],
    queryFn: () => api.get('/branches/my-schedule').then(res => res.data)
  })

  // Populate selectedDays once data loads
  useEffect(() => {
    if (currentSchedule) setSelectedDays(currentSchedule)
  }, [currentSchedule])

  const updateSchedule = useMutation({
    mutationFn: () => api.put('/branches/my-schedule', { days: selectedDays }),
    onSuccess: () => {
      showToast('Schedule updated successfully')
      queryClient.invalidateQueries(['my-schedule'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to update', 'error')
  })

  function toggleDay(day) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Branch Schedule</h2>
        <p className="text-sm text-gray-500 mt-1">Select which days classes are held at your branch</p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 max-w-md">
          <h3 className="font-semibold mb-4">Class Days</h3>
          <div className="space-y-3 mb-6">
            {DAYS.map(day => (
              <label
                key={day.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDays.includes(day.value)
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDays.includes(day.value)}
                  onChange={() => toggleDay(day.value)}
                  className="w-4 h-4 accent-gray-900"
                />
                <span className="font-medium">{day.label}</span>
                {selectedDays.includes(day.value) && (
                  <span className="ml-auto text-xs text-green-600 font-semibold">Class Day</span>
                )}
              </label>
            ))}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 mb-4">
              {selectedDays.length === 0
                ? 'No class days selected'
                : `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected — ${selectedDays.sort().map(d => DAYS[d].label).join(', ')}`
              }
            </p>
            <button
              onClick={() => updateSchedule.mutate()}
              disabled={updateSchedule.isPending}
              className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {updateSchedule.isPending ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default BranchSchedule