import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

function MainLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => api.get('/notifications/').then(res => res.data),
  refetchInterval: 30000 // refetch every 30 seconds
})

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0


  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Karate School</h1>
            <p className="text-sm text-gray-400 mt-1">{user?.role}</p>
          </div>
          <Link to="/notifications" className="relative">
          <span className="text-2xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
            </span>
          )}
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-700">
            Dashboard
          </Link>
          <Link to="/fees" className="block px-4 py-2 rounded hover:bg-gray-700">
            Fees
          </Link>
          <Link to="/photos" className="block px-4 py-2 rounded hover:bg-gray-700">
            Photos
          </Link>
        </nav>
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