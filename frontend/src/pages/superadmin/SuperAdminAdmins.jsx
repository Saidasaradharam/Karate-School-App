import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import api from '../../api/axios'

const EMPTY_FORM = {
  email: '', password: '', full_name: '',
  primary_branch_id: '',
  additional_branch_ids: [],
  dob: '', contact: '', address: '', belt_grade: ''
}

  function SuperAdminAdmins() {
    const queryClient = useQueryClient()
    const { toasts, showToast } = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState(null)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [showPromote, setShowPromote] = useState(false)
    const [promoteData, setPromoteData] = useState({
    user_id: '',
    primary_branch_id: '',
    additional_branch_ids: []
    })
    const [studentSearch, setStudentSearch] = useState('')

    const { data: allStudents } = useQuery({
    queryKey: ['all-students-for-promote'],
    queryFn: () => api.get('/students/').then(res => res.data),
    enabled: showPromote
  })
    const { data: admins, isLoading } = useQuery({
      queryKey: ['all-admins'],
      queryFn: () => api.get('/admins/').then(res => res.data)
    })

    const { data: branches } = useQuery({
      queryKey: ['branches-overview'],
      queryFn: () => api.get('/branches/overview').then(res => res.data)
    })

    const { data: beltGrades } = useQuery({
      queryKey: ['belt-grades'],
      queryFn: () => api.get('/belt-grades/public').then(res => res.data)
    })

    const createAdmin = useMutation({
      mutationFn: (data) => api.post('/admins/', data),
      onSuccess: () => {
        showToast('Admin created successfully')
        queryClient.invalidateQueries(['all-admins'])
        closeForm()
      },
      onError: (err) => showToast(err.response?.data?.detail || 'Failed to create admin', 'error')
    })

    const updateAdmin = useMutation({
      mutationFn: ({ id, data }) => api.put(`/admins/${id}`, data),
      onSuccess: () => {
        showToast('Admin updated successfully')
        queryClient.invalidateQueries(['all-admins'])
        closeForm()
      },
      onError: (err) => showToast(err.response?.data?.detail || 'Failed to update admin', 'error')
    })

    const deleteAdmin = useMutation({
      mutationFn: (id) => api.delete(`/admins/${id}`),
      onSuccess: () => {
        showToast('Admin deleted')
        queryClient.invalidateQueries(['all-admins'])
        setConfirmDelete(null)
      },
      onError: (err) => showToast(err.response?.data?.detail || 'Failed to delete admin', 'error')
    })

    const promoteAdmin = useMutation({
      mutationFn: (data) => api.post('/admins/promote', data),
      onSuccess: () => {
        showToast('User promoted to admin successfully')
        queryClient.invalidateQueries(['all-admins'])
        queryClient.invalidateQueries(['all-students-for-promote'])
        setShowPromote(false)
        setPromoteData({ user_id: '', primary_branch_id: '', additional_branch_ids: [] })
        setStudentSearch('')
      },
      onError: (err) => showToast(err.response?.data?.detail || 'Failed to promote', 'error')
    })

    function openCreate() {
      setEditingAdmin(null)
      setFormData(EMPTY_FORM)
      setShowForm(true)
    }

    function openEdit(admin) {
      setEditingAdmin(admin)
      setFormData({
        email: admin.email,
        password: '',
        full_name: admin.full_name,
        primary_branch_id: admin.primary_branch_id || '',
        additional_branch_ids: admin.additional_branch_ids || [],
        dob: admin.dob || '',
        contact: admin.contact || '',
        address: admin.address || '',
        belt_grade: admin.belt_grade || ''
      })
      setShowForm(true)
    }

    function closeForm() {
      setShowForm(false)
      setEditingAdmin(null)
      setFormData(EMPTY_FORM)
    }

    function toggleAdditionalBranch(branchId) {
      // Can't add primary branch as additional
      if (branchId === parseInt(formData.primary_branch_id)) return
      setFormData(prev => ({
        ...prev,
        additional_branch_ids: prev.additional_branch_ids.includes(branchId)
          ? prev.additional_branch_ids.filter(id => id !== branchId)
          : [...prev.additional_branch_ids, branchId]
      }))
    }

    function handlePrimaryBranchChange(branchId) {
      setFormData(prev => ({
        ...prev,
        primary_branch_id: branchId,
        // Remove from additional if it was there
        additional_branch_ids: prev.additional_branch_ids.filter(id => id !== parseInt(branchId))
      }))
    }

    function handleSubmit() {
      const payload = {
        ...formData,
        primary_branch_id: parseInt(formData.primary_branch_id),
        additional_branch_ids: formData.additional_branch_ids.map(id => parseInt(id))
      }
      if (editingAdmin) {
        if (!payload.password) delete payload.password
        updateAdmin.mutate({ id: editingAdmin.id, data: payload })
      } else {
        createAdmin.mutate(payload)
      }
    }

    const isPending = createAdmin.isPending || updateAdmin.isPending
    const isEditMode = !!editingAdmin

    const inputClass = "w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
    const labelClass = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"

    return (
      <MainLayout>
        <Toast toasts={toasts} />

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
              <p className="text-2xl mb-3">⚠️</p>
              <h3 className="font-bold text-lg mb-2">Delete Admin?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete <strong>{confirmDelete.full_name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteAdmin.mutate(confirmDelete.id)}
                  disabled={deleteAdmin.isPending}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteAdmin.isPending ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 border py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setShowPromote(!showPromote)}
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50"
            >
              ↑ Promote Existing User
            </button>
            <button
              onClick={openCreate}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-700"
            >
              + New Admin
            </button>
          </div>
        </div>

        {showPromote && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
            <h3 className="font-bold mb-1">Promote Existing User to Admin</h3>
            <p className="text-sm text-gray-500 mb-4">Select a registered student and assign them admin privileges</p>

            {/* Search */}
            <div className="mb-4">
              <label className={labelClass}>Search Student</label>
              <input
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Type name to search..."
                className={inputClass + ' bg-white'}
              />
            </div>

            {/* Student List */}
            <div className="bg-white rounded-xl border border-gray-200 max-h-48 overflow-y-auto mb-4">
              {allStudents?.filter(s =>
                s.full_name?.toLowerCase().includes(studentSearch.toLowerCase())
              ).map(s => (
                <div
                  key={s.id}
                  onClick={() => setPromoteData(prev => ({ ...prev, user_id: s.user_id }))}
                  className={`px-4 py-3 cursor-pointer border-b last:border-0 hover:bg-gray-50 flex justify-between items-center ${
                    promoteData.user_id === s.user_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{s.full_name}</p>
                    <p className="text-xs text-gray-400">{s.belt_grade}</p>
                  </div>
                  {promoteData.user_id === s.user_id && (
                    <span className="text-blue-600 text-xs font-semibold">Selected</span>
                  )}
                </div>
              ))}
              {allStudents?.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">No students found</p>
              )}
            </div>

            {/* Primary Branch */}
            <div className="mb-4">
              <label className={labelClass}>Primary Branch <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {branches?.map(b => (
                  <label
                    key={b.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      parseInt(promoteData.primary_branch_id) === b.id
                        ? 'border-gray-900 bg-gray-900 text-white font-semibold'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promote_primary_branch"
                      checked={parseInt(promoteData.primary_branch_id) === b.id}
                      onChange={() => setPromoteData(prev => ({
                        ...prev,
                        primary_branch_id: b.id,
                        additional_branch_ids: prev.additional_branch_ids.filter(id => id !== b.id)
                      }))}
                      className="hidden"
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Branches */}
            {promoteData.primary_branch_id && (
              <div className="mb-4">
                <label className={labelClass}>Additional Branches <span className="text-gray-400 font-normal normal-case text-xs">(optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {branches?.filter(b => b.id !== parseInt(promoteData.primary_branch_id)).map(b => (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                        promoteData.additional_branch_ids.includes(b.id)
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-semibold'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={promoteData.additional_branch_ids.includes(b.id)}
                        onChange={() => setPromoteData(prev => ({
                          ...prev,
                          additional_branch_ids: prev.additional_branch_ids.includes(b.id)
                            ? prev.additional_branch_ids.filter(id => id !== b.id)
                            : [...prev.additional_branch_ids, b.id]
                        }))}
                        className="hidden"
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => promoteAdmin.mutate({
                  user_id: parseInt(promoteData.user_id),
                  primary_branch_id: parseInt(promoteData.primary_branch_id),
                  additional_branch_ids: promoteData.additional_branch_ids
                })}
                disabled={promoteAdmin.isPending || !promoteData.user_id || !promoteData.primary_branch_id}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700"
              >
                {promoteAdmin.isPending ? 'Promoting...' : 'Promote to Admin'}
              </button>
              <button
                onClick={() => setShowPromote(false)}
                className="border px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Create / Edit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h3 className="font-bold mb-5">{isEditMode ? `Edit — ${editingAdmin.full_name}` : 'Create New Admin'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                <input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>
                  Password {isEditMode
                    ? <span className="text-gray-400 font-normal normal-case text-xs">(blank = keep current)</span>
                    : <span className="text-red-500">*</span>}
                </label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={isEditMode ? '••••••••' : ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact <span className="text-red-500">*</span></label>
                <input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Belt Grade <span className="text-red-500">*</span></label>
                <select value={formData.belt_grade} onChange={e => setFormData({...formData, belt_grade: e.target.value})} className={inputClass}>
                  <option value="">Select grade</option>
                  {beltGrades?.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Address <span className="text-red-500">*</span></label>
                <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass} />
              </div>

              {/* Primary Branch */}
              <div className="col-span-2">
                <label className={labelClass}>Primary Branch <span className="text-red-500">*</span></label>
                <p className="text-xs text-gray-400 mb-2">The main branch this admin manages</p>
                <div className="flex flex-wrap gap-2">
                  {branches?.map(b => (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                        parseInt(formData.primary_branch_id) === b.id
                          ? 'border-gray-900 bg-gray-900 text-white font-semibold'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="primary_branch"
                        value={b.id}
                        checked={parseInt(formData.primary_branch_id) === b.id}
                        onChange={() => handlePrimaryBranchChange(b.id)}
                        className="hidden"
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Branches */}
              <div className="col-span-2">
                <label className={labelClass}>Additional Branches <span className="text-gray-400 font-normal normal-case text-xs">(optional)</span></label>
                <p className="text-xs text-gray-400 mb-2">Extra branches this admin can also access</p>
                <div className="flex flex-wrap gap-2">
                  {branches?.filter(b => b.id !== parseInt(formData.primary_branch_id)).map(b => (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                        formData.additional_branch_ids.includes(b.id)
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-semibold'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.additional_branch_ids.includes(b.id)}
                        onChange={() => toggleAdditionalBranch(b.id)}
                        className="hidden"
                      />
                      {b.name}
                    </label>
                  ))}
                  {!formData.primary_branch_id && (
                    <p className="text-xs text-gray-400 italic">Select a primary branch first</p>
                  )}
                  {formData.primary_branch_id && branches?.filter(b => b.id !== parseInt(formData.primary_branch_id)).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No other branches available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={isPending || !formData.email || (!isEditMode && !formData.password) || !formData.primary_branch_id}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {isPending
                  ? (isEditMode ? 'Saving...' : 'Creating...')
                  : (isEditMode ? 'Save Changes' : 'Create Admin')}
              </button>
              <button onClick={closeForm} className="border px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Admins List */}
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : admins?.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">No admins yet</div>
          ) : (
            admins?.map(admin => {
              const primaryBranch = branches?.find(b => b.id === admin.primary_branch_id)
              const additionalBranches = branches?.filter(b => admin.additional_branch_ids?.includes(b.id))
              return (
                <div key={admin.id} className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{admin.full_name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{admin.email}</p>
                      {admin.contact && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 5.55 5.55l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
                          </svg>
                          {admin.contact}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {primaryBranch && (
                          <span className="px-2 py-1 bg-gray-900 text-white rounded-full text-xs font-semibold inline-flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            {primaryBranch.name}
                          </span>
                        )}
                        {additionalBranches?.map(b => (
                          <span key={b.id} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                            {b.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEdit(admin)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(admin)}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </MainLayout>
    )
  }

export default SuperAdminAdmins