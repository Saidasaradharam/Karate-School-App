import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import api from '../api/axios'


function Register() {
  const navigate = useNavigate()
  const [branches, setBranches] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '', password: '', branch_id: '',
    full_name: '', dob: '', parent_name: '',
    address: '', contact: '', belt_grade: 'white',
    last_graduation_date: '', emergency_contact: ''
  })

const [beltGrades, setBeltGrades] = useState([])

useEffect(() => {
  api.get('/branches/public').then(res => setBranches(res.data)).catch(() => {})
  api.get('/belt-grades/public').then(res => setBeltGrades(res.data)).catch(() => {})
}, [])

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Step 1 — create user account
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        role: 'student',
        branch_id: parseInt(formData.branch_id)
      })
      // Step 2 — login to get token
      const loginRes = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      })
      const token = loginRes.data.access_token
      // Step 3 — create student profile
      await api.post('/students/register', {
        full_name: formData.full_name,
        dob: formData.dob,
        parent_name: formData.parent_name,
        address: formData.address,
        contact: formData.contact,
        belt_grade: formData.belt_grade,
        last_graduation_date: formData.last_graduation_date || null,
        emergency_contact: formData.emergency_contact
      }, { headers: { Authorization: `Bearer ${token}` } })

      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold mb-6 text-center">Student Registration</h2>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500 mb-4">
          Fields marked with <span className="text-red-500 font-bold">*</span> are required
        </p>
        <div>
          <label className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Branch <span className="text-red-500">*</span>
          </label>
          <select name="branch_id" value={formData.branch_id} onChange={handleChange} required className="w-full border rounded px-3 py-2">
            <option value="">Select a branch</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name} — {b.location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Parent / Guardian Name <span className="text-red-500">*</span>
          </label>
          <input type="text" name="parent_name" value={formData.parent_name} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <input type="text" name="contact" value={formData.contact} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Belt Grade <span className="text-red-500">*</span>
          </label>
          <select name="belt_grade" value={formData.belt_grade} onChange={handleChange} className="w-full border rounded px-3 py-2">
            {beltGrades.map(g => (
                <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Last Graduation Date <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <input type="date" name="last_graduation_date" value={formData.last_graduation_date} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Emergency Contact <span className="text-red-500">*</span>
          </label>
          <input type="text" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-700 disabled:opacity-50">
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="text-sm text-center mt-4">
        Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
      </p>
    </AuthLayout>
  )
}

export default Register