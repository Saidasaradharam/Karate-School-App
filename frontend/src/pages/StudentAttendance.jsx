import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import api from '../api/axios'
import TableWrapper from '../components/TableWrapper'

const STATUS_STYLES = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  informed_leave: 'bg-yellow-100 text-yellow-800'
}

function StudentAttendance() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: records, isLoading } = useQuery({
    queryKey: ['my-attendance', month, year],
    queryFn: () => api.get(`/attendance/my-attendance?month=${month}&year=${year}`).then(res => res.data)
  })

  const present = records?.filter(r => r.status === 'present').length || 0
  const absent = records?.filter(r => r.status === 'absent').length || 0
  const informed = records?.filter(r => r.status === 'informed_leave').length || 0

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Attendance</h2>
        <div className="flex gap-3">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="border rounded px-3 py-2 text-sm">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded px-3 py-2 text-sm w-20" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-700">Present</p>
          <p className="text-3xl font-bold text-green-800">{present}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-700">Absent</p>
          <p className="text-3xl font-bold text-red-800">{absent}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-sm text-yellow-700">Informed Leave</p>
          <p className="text-3xl font-bold text-yellow-800">{informed}</p>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <TableWrapper>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Day</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="3" className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : records?.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-8 text-gray-500">No attendance records for this month</td></tr>
              ) : (
                records?.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{r.date}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(r.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status]}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>

      </div>
    </MainLayout>
  )
}

export default StudentAttendance