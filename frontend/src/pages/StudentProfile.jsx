import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import api from '../api/axios'

const FIELD_CONFIG = [
  { name: 'full_name', label: 'Full Name', type: 'text', required: true, section: 'personal' },
  { name: 'dob', label: 'Date of Birth', type: 'date', required: true, section: 'personal' },
  { name: 'contact', label: 'Contact Number', type: 'text', required: true, section: 'personal' },
  { name: 'emergency_contact', label: 'Emergency Contact', type: 'text', required: false, section: 'personal' },
  { name: 'parent_name', label: 'Parent / Guardian', type: 'text', required: false, section: 'personal' },
  { name: 'address', label: 'Address', type: 'text', required: true, section: 'personal' },
  { name: 'last_graduation_date', label: 'Last Graduation Date', type: 'date', required: false, section: 'karate' },
]

function StudentProfile() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/students/me').then(res => res.data)
  })

  const { data: beltGrades } = useQuery({
    queryKey: ['belt-grades'],
    queryFn: () => api.get('/belt-grades/public').then(res => res.data)
  })

  useEffect(() => {
    if (profile) setFormData({ ...profile })
  }, [profile])

  const updateProfile = useMutation({
    mutationFn: (data) => api.put('/students/me', data),
    onSuccess: () => {
      showToast('Profile updated successfully')
      queryClient.invalidateQueries(['my-profile'])
      setEditing(false)
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to update', 'error')
  })

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    updateProfile.mutate({
      full_name: formData.full_name,
      dob: formData.dob,
      parent_name: formData.parent_name,
      address: formData.address,
      contact: formData.contact,
      belt_grade: formData.belt_grade,
      last_graduation_date: formData.last_graduation_date || null,
      emergency_contact: formData.emergency_contact
    })
  }

  const BELT_COLORS = {
    white: '#f8f8f8', yellow: '#fde047', blue: '#3b82f6',
    orange: '#f97316', purple: '#a855f7', green: '#22c55e',
    brown: '#92400e', black: '#111827'
  }

  function getBeltColor(grade) {
    const base = grade?.split('-')[0]
    return BELT_COLORS[base] || '#6b7280'
  }

  if (isLoading || !formData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      {/* Hero Header */}
      <div className="relative bg-gray-900 rounded-2xl p-8 mb-6 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px'
          }}
        />
        <div className="relative flex items-center gap-6">
          
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Personal Information Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="text-lg">👤</span>
              <h3 className="font-bold text-gray-900">Personal Information</h3>
            </div>
            <div className="p-6 space-y-5">
              {FIELD_CONFIG.filter(f => f.section === 'personal').map(field => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    {field.label}
                  </label>
                  {editing ? (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium text-sm">
                      {formData[field.name] || <span className="text-gray-400 font-normal">Not set</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Karate Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="text-lg">🥋</span>
              <h3 className="font-bold text-gray-900">Karate Details</h3>
            </div>
            <div className="p-6 space-y-5">

              {/* Belt Grade */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Belt Grade
                </label>
                {editing ? (
                  <select
                    name="belt_grade"
                    value={formData.belt_grade}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {beltGrades?.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                      style={{ backgroundColor: getBeltColor(formData.belt_grade) }}
                    />
                    <span className="text-gray-900 font-medium text-sm capitalize">{formData.belt_grade}</span>
                  </div>
                )}
              </div>

              {/* Last Graduation Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Last Graduation Date
                </label>
                {editing ? (
                  <input
                    type="date"
                    name="last_graduation_date"
                    value={formData.last_graduation_date || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 font-medium text-sm">
                    {formData.last_graduation_date || <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                )}
              </div>

              {/* Belt visual progress */}
              {!editing && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Belt Journey</p>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(BELT_COLORS).map(([belt, color]) => {
                      const isActive = formData.belt_grade?.startsWith(belt)
                      return (
                        <div
                          key={belt}
                          title={belt}
                          className={`h-2 flex-1 rounded-full transition-all ${isActive ? 'scale-y-150' : 'opacity-30'}`}
                          style={{ backgroundColor: color, border: belt === 'white' ? '1px solid #e5e7eb' : 'none' }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save / Cancel Bar */}
        {editing && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-3">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {updateProfile.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setFormData({ ...profile }) }}
              className="flex-1 border border-gray-200 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </MainLayout>
  )
}

export default StudentProfile