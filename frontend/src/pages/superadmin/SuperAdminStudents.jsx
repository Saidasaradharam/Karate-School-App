import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import StudentProfileModal from '../../components/StudentProfileModal'
import api from '../../api/axios'

function SuperAdminStudents() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterBelt, setFilterBelt] = useState('')

  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: () => api.get('/students/').then(res => res.data)
  })

  const { data: branches } = useQuery({
    queryKey: ['branches-overview'],
    queryFn: () => api.get('/branches/overview').then(res => res.data)
  })

  const { data: beltGrades } = useQuery({
    queryKey: ['belt-grades'],
    queryFn: () => api.get('/belt-grades/public').then(res => res.data)
  })

  const filtered = students?.filter(s => {
    const matchName = s.full_name.toLowerCase().includes(search.toLowerCase())
    const matchBelt = filterBelt ? s.belt_grade === filterBelt : true
    const matchBranch = filterBranch ? s.branch_id === parseInt(filterBranch) : true
    return matchName && matchBelt && matchBranch
  })

  const totalFiltered = filtered?.length || 0

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">All Students</h2>
        <p className="text-sm text-gray-500 mt-1">Read-only view across all branches</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-sm text-indigo-600 font-medium">Total Students</p>
          <p className="text-2xl font-bold text-indigo-900">{students?.length || 0}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-sm text-indigo-600 font-medium">Branches</p>
          <p className="text-2xl font-bold text-indigo-900">{branches?.length || 0}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-sm text-indigo-600 font-medium">Showing</p>
          <p className="text-2xl font-bold text-indigo-900">{totalFiltered}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1 min-w-40"
        />
        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Branches</option>
          {branches?.map(b => (
            <option key={b.id} value={b.id}>{b.name} — {b.location}</option>
          ))}
        </select>
        <select
          value={filterBelt}
          onChange={e => setFilterBelt(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Belt Grades</option>
          {beltGrades?.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        {(search || filterBranch || filterBelt) && (
          <button
            onClick={() => { setSearch(''); setFilterBranch(''); setFilterBelt('') }}
            className="text-sm text-red-500 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-indigo-100">
        <table className="w-full">
          <thead className="bg-indigo-900 text-white">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold">Name</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Branch</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Belt Grade</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Contact</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : filtered?.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">No students found</td></tr>
            ) : (
              filtered?.map((s, idx) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`border-b cursor-pointer hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{s.full_name}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {branches?.find(b => b.id === s.branch_id)?.name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold capitalize">
                      {s.belt_grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{s.contact}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
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

export default SuperAdminStudents