import { createContext, useContext, useState, useEffect } from 'react'
import { authApi, notificationsApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi.me()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setLoading(false))
    } else {
      setTimeout(() => setLoading(false), 0)
    }
  }, [])

  // Poll for unread notifications every 30s
  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      try {
        const res = await notificationsApi.list({ unread: true })
        setUnreadCount(res.data.unread_count || 0)
      } catch {
        // Silently fail for notification polling
      }
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [user])

  const login = async (email, password) => {
    const res = await authApi.login({ email, password })
    localStorage.setItem('access_token', res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    setUser(res.data.user)
    return res.data
  }

  const register = async (data) => {
    const res = await authApi.register(data)
    return res.data
  }

  const logout = async () => {
    try {
      await authApi.logout(localStorage.getItem('refresh_token'))
    } catch {
      // Logout might fail if token is already expired
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const updateUser = (data) => setUser((prev) => ({ ...prev, ...data }))

  return (
    <AuthContext.Provider value={{
      user, loading, unreadCount, setUnreadCount,
      login, register, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
