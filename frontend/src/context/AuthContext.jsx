import { createContext, useContext, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)


export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const refreshUser = async () => {
    try {
        const res = await api.get('/auth/me')
        const freshUser = {
            role: res.data.role,
            branch_id: res.data.branch_id,
            full_name: res.data.full_name
        }
        setUser(freshUser)
        localStorage.setItem('user', JSON.stringify(freshUser))
        return freshUser
    } catch (err) {
        logout()
        return null
    }
}

  function login(userData, accessToken) {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', accessToken)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}