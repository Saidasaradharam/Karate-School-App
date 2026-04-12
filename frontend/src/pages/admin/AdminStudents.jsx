import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import StudentProfileModal from '../../components/StudentProfileModal'
import api from '../../api/axios'
import TableWrapper from '../../components/TableWrapper'
import PromoteStudentModal from '../../components/PromoteStudentModal'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

function AdminStudents() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBelt, setFilterBelt] = useState('')
  const [showPromote, setShowPromote] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState(null)
  const { toasts, showToast } = useToast()

  const { data: myBranches } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => api.get('/branches/my-branches').then(res => res.data)
  })

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', selectedBranch],
    queryFn: () => {
      const params = new URLSearchParams()
      if (selectedBranch) params.append('branch_id', selectedBranch)
      return api.get(`/students/?${params}`).then(res => res.data)
    }
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
      <Toast toasts={toasts} />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Students</h2>
        <button
          onClick={() => setShowPromote(true)}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50"
        >
          ↑ Promote to Admin
        </button>
      </div>

      {/* Branch selector — only show if admin has multiple branches */}
      {myBranches?.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setSelectedBranch(null)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
              selectedBranch === null
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Branches
          </button>
          {myBranches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
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

      {/* Student count */}
      {myBranches?.length === 1 && (
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-semibold text-gray-800">{students?.length || 0}</span> students in {myBranches[0].name}
        </p>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
        <select
          value={filterBelt}
          onChange={e => setFilterBelt(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All belt grades</option>
          {beltGrades?.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <TableWrapper>
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
                  <tr
                    key={s.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <td className="px-6 py-4 font-medium">{s.full_name}</td>
                    <td className="px-6 py-4 capitalize">{s.belt_grade}</td>
                    <td className="px-6 py-4">{s.contact}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-blue-600 text-sm">View →</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>

      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {showPromote && (
        <PromoteStudentModal
          onClose={() => setShowPromote(false)}
          showToast={showToast}
        />
      )}
    </MainLayout>
  )
}

export default AdminStudents