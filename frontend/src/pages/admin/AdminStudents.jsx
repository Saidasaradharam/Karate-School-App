import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import StudentProfileModal from '../../components/StudentProfileModal'
import api from '../../api/axios'

function AdminStudents() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBelt, setFilterBelt] = useState('')

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => api.get('/students/').then(res => res.data)
  })

  const { data: beltGrades } = useQuery({
    queryKey: ['belt-grades'],
    queryFn: () => api.get('/belt-grades/public').then(res => res.data)
  })

  const filtered = students?.filter(s => {
    const matchName = s.full_name.toLowerCase().includes(search.toLowerCase())
    const matchBelt = filterBelt ? s.belt_grade === filterBelt : true
    return matchName && matchBelt
  })

  return (
    <MainLayout>
      <h2 className="text-2xl font-bold mb-6">Students</h2>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
        <select value={filterBelt} onChange={e => setFilterBelt(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All belt grades</option>
          {beltGrades?.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Name</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Belt Grade</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Contact</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Joined</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : filtered?.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">No students found</td></tr>
            ) : (
              filtered?.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedStudent(s)}>
                  <td className="px-6 py-4 font-medium">{s.full_name}</td>
                  <td className="px-6 py-4 capitalize">{s.belt_grade}</td>
                  <td className="px-6 py-4">{s.contact}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-blue-600 text-sm">View →</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </MainLayout>
  )
}
export default AdminStudents