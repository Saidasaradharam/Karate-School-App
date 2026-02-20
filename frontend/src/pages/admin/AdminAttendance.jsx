import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import api from '../../api/axios'

const STATUS_OPTIONS = ['present', 'absent', 'informed_leave']
const STATUS_STYLES = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  informed_leave: 'bg-yellow-100 text-yellow-800',
  not_marked: 'bg-gray-100 text-gray-500'
}

function AdminAttendance() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const [mode, setMode] = useState('mark')  // 'mark' or 'view'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())

  // Mark mode query
  const { data: attendanceList, isLoading, error } = useQuery({
    queryKey: ['branch-attendance', selectedDate],
    queryFn: () => api.get(`/attendance/branch?date=${selectedDate}`).then(res => {
      const map = {}
      res.data.forEach(s => {
        map[s.student_id] = s.status === 'not_marked' ? 'present' : s.status
      })
      setAttendanceMap(map)
      return res.data
    }),
    enabled: mode === 'mark'
  })

  // View mode query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['attendance-history', viewMonth, viewYear],
    queryFn: () => api.get(`/attendance/branch/history?month=${viewMonth}&year=${viewYear}`).then(res => res.data),
    enabled: mode === 'view'
  })

  const markBulk = useMutation({
    mutationFn: () => api.post('/attendance/mark-bulk', {
      date: selectedDate,
      records: Object.entries(attendanceMap).map(([student_id, status]) => ({
        student_id: parseInt(student_id),
        status
      }))
    }),
    onSuccess: () => {
      showToast('Attendance saved successfully')
      queryClient.invalidateQueries(['branch-attendance'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to save', 'error')
  })

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Attendance</h2>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('mark')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'mark' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setMode('view')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'view' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            View History
          </button>
        </div>
      </div>

      {/* MARK MODE */}
      {mode === 'mark' && (
        <>
          <div className="flex gap-3 items-center mb-6">
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <button
              onClick={() => markBulk.mutate()}
              disabled={markBulk.isPending}
              className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {markBulk.isPending ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4">
              {error.response?.data?.detail || 'No class scheduled on this day'}
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Student</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="2" className="text-center py-8 text-gray-500">Loading...</td></tr>
                ) : attendanceList?.length === 0 ? (
                  <tr><td colSpan="2" className="text-center py-8 text-gray-500">No students found</td></tr>
                ) : (
                  attendanceList?.map(s => (
                    <tr key={s.student_id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{s.full_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {STATUS_OPTIONS.map(status => (
                            <button
                              key={status}
                              onClick={() => setAttendanceMap(prev => ({...prev, [s.student_id]: status}))}
                              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                                attendanceMap[s.student_id] === status
                                  ? STATUS_STYLES[status]
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {status.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* VIEW MODE */}
      {mode === 'view' && (
        <>
          <div className="flex gap-3 items-center mb-6">
            <select value={viewMonth} onChange={e => setViewMonth(parseInt(e.target.value))} className="border rounded px-3 py-2 text-sm">
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={i} value={i+1}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={viewYear}
              onChange={e => setViewYear(parseInt(e.target.value))}
              className="border rounded px-3 py-2 text-sm w-20"
            />
          </div>

          {historyLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-4">
              {historyData?.map(student => (
                <div key={student.student_id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{student.full_name}</h3>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-700 font-medium">Present: {student.present}</span>
                      <span className="text-red-700 font-medium">Absent: {student.absent}</span>
                      <span className="text-yellow-700 font-medium">Leave: {student.informed_leave}</span>
                      <span className="text-gray-500">Total: {student.total_classes}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.records.map(r => (
                      <div key={r.date} className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                        {new Date(r.date).getDate()} — {r.status.replace('_', ' ')}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </MainLayout>
  )
}

export default AdminAttendance