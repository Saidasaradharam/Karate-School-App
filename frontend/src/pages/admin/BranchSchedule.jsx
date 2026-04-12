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
  const [selectedBranch, setSelectedBranch] = useState(null)

  // Fetch admin's branches
  const { data: myBranches } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => api.get('/branches/my-branches').then(res => res.data),
    onSuccess: (data) => {
      // Auto-select first branch if none selected
      if (data?.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0].id)
      }
    }
  })

  // Set first branch once loaded
  useEffect(() => {
    if (myBranches?.length > 0 && !selectedBranch) {
      setSelectedBranch(myBranches[0].id)
    }
  }, [myBranches])

  // Fetch schedule for selected branch
  const { data: currentSchedule, isLoading } = useQuery({
    queryKey: ['my-schedule', selectedBranch],
    queryFn: () => {
      const params = new URLSearchParams()
      if (selectedBranch) params.append('branch_id', selectedBranch)
      return api.get(`/branches/my-schedule?${params}`).then(res => res.data)
    },
    enabled: !!selectedBranch
  })

  // Populate selectedDays when schedule or branch changes
  useEffect(() => {
    if (currentSchedule) setSelectedDays(currentSchedule)
    else setSelectedDays([])
  }, [currentSchedule, selectedBranch])

  const updateSchedule = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams()
      if (selectedBranch) params.append('branch_id', selectedBranch)
      return api.put(`/branches/my-schedule?${params}`, { days: selectedDays })
    },
    onSuccess: () => {
      showToast('Schedule updated successfully')
      queryClient.invalidateQueries(['my-schedule', selectedBranch])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to update', 'error')
  })

  function toggleDay(day) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const selectedBranchName = myBranches?.find(b => b.id === selectedBranch)?.name

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Branch Schedule</h2>
        <p className="text-sm text-gray-500 mt-1">Select which days classes are held at each branch</p>
      </div>

      {/* Branch selector — only show if admin has multiple branches */}
      {myBranches?.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {myBranches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                selectedBranch === b.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 max-w-md">
          <h3 className="font-semibold mb-1">Class Days</h3>
          {selectedBranchName && (
            <p className="text-xs text-gray-400 mb-4">Setting schedule for {selectedBranchName}</p>
          )}
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
              disabled={updateSchedule.isPending || !selectedBranch}
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