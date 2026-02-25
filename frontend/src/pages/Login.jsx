import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import '../styles/login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', formData)
      const token = res.data.access_token
      let fullName = null
      try {
        const profile = await api.get('/students/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        fullName = profile.data?.full_name
      } catch {
        fullName = res.data.email?.split('@')[0]
      }
      login(
        { role: res.data.role, branch_id: res.data.branch_id, full_name: fullName },
        res.data.access_token
      )
      if (res.data.role === 'super_admin') navigate('/superadmin/dashboard')
      else if (res.data.role === 'admin') navigate('/admin/dashboard')
      else navigate('/dashboard')
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a minute.')
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>

      <div className="login-root">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="stripe-accent" />
          <div className="kanji-watermark">講道館</div>

          <div className="left-top">
            <div className="logo-row">
              <img
                src="/src/assets/logo.png"
                alt="Logo"
                className="logo-img"
                onError={e => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className="logo-fallback" style={{ display: 'none' }}>🥋</div>
              <span className="school-name">Kodokan India</span>
            </div>
          </div>

          <div className="left-middle">
            <p className="hero-label">Member Portal</p>
            <h1 className="hero-title">
              Forge<br />
              Your<br />
              <span>Path.</span>
            </h1>
            <p className="hero-desc">
              Track your progress, manage fees, and stay connected with your dojo — all in one place.
            </p>
            <div className="belt-row">
              {[
                { color: '#f8f8f8', border: '1px solid #333' },
                { color: '#fde047' },
                { color: '#3b82f6' },
                { color: '#f97316' },
                { color: '#a855f7' },
                { color: '#22c55e' },
                { color: '#92400e' },
                { color: '#0a0808' },
              ].map((b, i) => (
                <div
                  key={i}
                  className="belt-bar"
                  style={{
                    background: b.color,
                    border: b.border || 'none',
                    opacity: i < 5 ? 1 : 0.4
                  }}
                />
              ))}
              <span className="belt-label">YOUR JOURNEY</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <p className="form-eyebrow">Welcome Back</p>
          <h2 className="form-title">Sign In</h2>

          {error && <div className="error-msg">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label
                className={`field-label ${focused === 'email' ? 'active' : ''}`}
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                placeholder="you@sample.com"
                required
                className="field-input"
                autoComplete="email"
              />
            </div>

            <div className="field-group">
              <label
                className={`field-label ${focused === 'password' ? 'active' : ''}`}
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                placeholder="••••••••"
                required
                className="field-input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="submit-btn"
            >
              {loading ? (
                <><span className="loader" />Signing In</>
              ) : (
                'Enter Dojo'
              )}
            </button>
          </form>

          <p className="register-link">
            New student? <Link to="/register">Create account</Link>
          </p>

          <div className="corner-deco" />
        </div>
      </div>
    </>
  )
}
