import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

function MainLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then(res => res.data),
    refetchInterval: 30000
  })

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            {/* Logo */}
            <img
              src="/src/assets/logo.svg"
              alt="Logo"
              className="w-9 h-9 rounded-lg object-cover"
              onError={e => e.target.style.display = 'none'}  // hide if logo missing
            />
            <h1 className="text-lg font-bold">Karate School</h1>
          </div>

          {/* User info + bell */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
            <Link to="/notifications" className="relative">
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-2">
          {isSuperAdmin ? (
            <>
              <Link to="/superadmin/dashboard" className="block px-4 py-2 rounded hover:bg-gray-700">Dashboard</Link>
              <Link to="/superadmin/students" className="block px-4 py-2 rounded hover:bg-gray-700">Students</Link>
              <Link to="/superadmin/fees" className="block px-4 py-2 rounded hover:bg-gray-700">Fee Entry</Link>
              <Link to="/admin/attendance" className="block px-4 py-2 rounded hover:bg-gray-700">Attendance</Link>
              <Link to="/admin/schedule" className="block px-4 py-2 rounded hover:bg-gray-700">Schedule</Link>
              <Link to="/photos" className="block px-4 py-2 rounded hover:bg-gray-700">Photos</Link>
            </>
          ) : isAdmin ? (
            <>
              <Link to="/admin/dashboard" className="block px-4 py-2 rounded hover:bg-gray-700">Dashboard</Link>
              <Link to="/admin/students" className="block px-4 py-2 rounded hover:bg-gray-700">Students</Link>
              <Link to="/admin/attendance" className="block px-4 py-2 rounded hover:bg-gray-700">Attendance</Link>
              <Link to="/admin/schedule" className="block px-4 py-2 rounded hover:bg-gray-700">Schedule</Link>
              <Link to="/photos" className="block px-4 py-2 rounded hover:bg-gray-700">Photos</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-700">Dashboard</Link>
              <Link to="/fees" className="block px-4 py-2 rounded hover:bg-gray-700">Fees</Link>
              <Link to="/attendance" className="block px-4 py-2 rounded hover:bg-gray-700">Attendance</Link>
              <Link to="/photos" className="block px-4 py-2 rounded hover:bg-gray-700">Photos</Link>
              <Link to="/profile" className="block px-4 py-2 rounded hover:bg-gray-700">My Profile</Link>
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button onClick={handleLogout} className="w-full px-4 py-2 bg-red-600 rounded hover:bg-red-700">
            Logout
          </button>
        </div>

      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default MainLayout