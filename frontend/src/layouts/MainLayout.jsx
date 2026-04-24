import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

function MainLayout({ children }) {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  const { data: notifications } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/').then(res => res.data),
    refetchInterval: 30000
  })
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function isActive(path) {
    return location.pathname === path
  }

  async function handleRefresh() {
    setRefreshing(true)
    const freshUser = await refreshUser()
    setRefreshing(false)
    if (!freshUser) return
    if (freshUser.role === 'super_admin') navigate('/superadmin/dashboard')
    else if (freshUser.role === 'admin') navigate('/admin/dashboard')
    else navigate('/dashboard')
    window.location.reload()
  }

  const RefreshBtn = () => (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="relative p-2 text-gray-300 hover:text-white transition-colors"
      title="Refresh"
    >
      <span className={`text-lg ${refreshing ? 'animate-spin inline-block' : ''}`}>
        🔄
      </span>
    </button>
  )

  const NotificationBell = ({ onClick }) => (
    <Link to="/notifications" className="relative p-2" onClick={onClick}>
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </Link>
  )

  const navLinkClass = (path) =>
    `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-white text-gray-900'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`

  const NavLinks = () => (
    <>
      {isSuperAdmin ? (
        <>
          <Link to="/superadmin/dashboard" className={navLinkClass('/superadmin/dashboard')} onClick={() => setSidebarOpen(false)}>Dashboard</Link>
          <Link to="/superadmin/students" className={navLinkClass('/superadmin/students')} onClick={() => setSidebarOpen(false)}>Students</Link>
          <Link to="/superadmin/fees" className={navLinkClass('/superadmin/fees')} onClick={() => setSidebarOpen(false)}>Fee Entry</Link>
          <Link to="/admin/attendance" className={navLinkClass('/admin/attendance')} onClick={() => setSidebarOpen(false)}>Attendance</Link>
          <Link to="/admin/schedule" className={navLinkClass('/admin/schedule')} onClick={() => setSidebarOpen(false)}>Schedule</Link>
          <Link to="/superadmin/branches" className={navLinkClass('/superadmin/branches')} onClick={() => setSidebarOpen(false)}>Branches</Link>
          <Link to="/superadmin/admins" className={navLinkClass('/superadmin/admins')} onClick={() => setSidebarOpen(false)}>Admins</Link>
          {/* <Link to="/photos" className={navLinkClass('/photos')} onClick={() => setSidebarOpen(false)}>Photos</Link> */}
        </>
      ) : isAdmin ? (
        <>
          <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')} onClick={() => setSidebarOpen(false)}>Dashboard</Link>
          <Link to="/admin/students" className={navLinkClass('/admin/students')} onClick={() => setSidebarOpen(false)}>Students</Link>
          <Link to="/admin/attendance" className={navLinkClass('/admin/attendance')} onClick={() => setSidebarOpen(false)}>Attendance</Link>
          <Link to="/admin/schedule" className={navLinkClass('/admin/schedule')} onClick={() => setSidebarOpen(false)}>Schedule</Link>
          <Link to="/admin/branches" className={navLinkClass('/admin/branches')} onClick={() => setSidebarOpen(false)}>Branches</Link>
          {/* <Link to="/photos" className={navLinkClass('/photos')} onClick={() => setSidebarOpen(false)}>Photos</Link> */}
        </>
      ) : (
        <>
          <Link to="/dashboard" className={navLinkClass('/dashboard')} onClick={() => setSidebarOpen(false)}>Dashboard</Link>
          <Link to="/fees" className={navLinkClass('/fees')} onClick={() => setSidebarOpen(false)}>Fees</Link>
          <Link to="/attendance" className={navLinkClass('/attendance')} onClick={() => setSidebarOpen(false)}>Attendance</Link>
          {/* <Link to="/photos" className={navLinkClass('/photos')} onClick={() => setSidebarOpen(false)}>Photos</Link> */}
          <Link to="/profile" className={navLinkClass('/profile')} onClick={() => setSidebarOpen(false)}>My Profile</Link>
        </>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar — always visible */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-gray-900 text-white min-h-screen">
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-lg object-cover"
              onError={e => e.target.style.display = 'none'}
            />
            <h1 className="text-lg font-bold">Kodokan India</h1>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="flex items-center gap-1">
              <RefreshBtn />
              <NotificationBell />
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar — slide in */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-30 flex flex-col transition-transform duration-300 lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-lg object-cover"
              onError={e => e.target.style.display = 'none'}
            />
            <h1 className="text-lg font-bold">Kodokan India</h1>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="flex items-center gap-1">
              <RefreshBtn />
              <NotificationBell onClick={() => setSidebarOpen(false)} />
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
          <span className="font-bold">Kodokan India</span>
          <div className="flex items-center gap-1">
            <RefreshBtn />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MainLayout