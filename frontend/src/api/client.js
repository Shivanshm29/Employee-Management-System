import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Queue for concurrent 401s
let isRefreshing = false
let refreshQueue = []

const processQueue = (error, token = null) => {
  refreshQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  refreshQueue = []
}

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    
    // If 401 and not already a retry or refresh attempt
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token available')
        
        // Use basic axios to avoid interceptor loop
        const { data } = await axios.post('/api/auth/refresh/', { refresh })
        const newToken = data.access
        
        localStorage.setItem('access_token', newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        
        processQueue(null, newToken)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (window.location.pathname !== '/login') {
            window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api

export const authApi = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  users: (params) => api.get('/auth/users/', { params }),
  departments: () => api.get('/auth/departments/'),
  createDepartment: (data) => api.post('/auth/departments/', data),
  workLogs: () => api.get('/auth/work-logs/'),
}

export const tasksApi = {
  list: (params) => api.get('/tasks/', { params }),
  get: (id) => api.get(`/tasks/${id}/`),
  create: (data) => api.post('/tasks/', data),
  update: (id, data) => api.patch(`/tasks/${id}/`, data),
  delete: (id) => api.delete(`/tasks/${id}/`),
  complete: (id, data) => api.post(`/tasks/${id}/complete/`, data),
  comments: (id) => api.get(`/tasks/${id}/comments/`),
  addComment: (id, data) => api.post(`/tasks/${id}/comments/`, data),
  reassign: (id, data) => api.post(`/tasks/${id}/reassign/`, data),
  history: (id) => api.get(`/tasks/${id}/history/`),
  sprints: (params) => api.get('/tasks/sprints/', { params }),
  createSprint: (data) => api.post('/tasks/sprints/', data),
  updateSprint: (id, data) => api.patch(`/tasks/sprints/${id}/`, data),
  checklist: (params) => api.get('/tasks/checklist/', { params }),
  addToChecklist: (data) => api.post('/tasks/checklist/', data),
  updateChecklist: (id, data) => api.patch(`/tasks/checklist/${id}/`, data),
  completeChecklist: (id, data) => api.post(`/tasks/checklist/${id}/complete/`, data),
  deleteChecklist: (id) => api.delete(`/tasks/checklist/${id}/`),
}

export const ticketsApi = {
  list: (params) => api.get('/tickets/', { params }),
  get: (id) => api.get(`/tickets/${id}/`),
  create: (data) => api.post('/tickets/', data),
  update: (id, data) => api.patch(`/tickets/${id}/`, data),
  delete: (id) => api.delete(`/tickets/${id}/`),
  approve: (id) => api.post(`/tickets/${id}/approve/`),
  reassign: (id, data) => api.post(`/tickets/${id}/reassign/`, data),
  comments: (id) => api.get(`/tickets/${id}/comments/`),
  addComment: (id, data) => api.post(`/tickets/${id}/comments/`, data),
  history: (id) => api.get(`/tickets/${id}/history/`),
}

export const meetingsApi = {
  list: (params) => api.get('/meetings/', { params }),
  today: () => api.get('/meetings/today/'),
  get: (id) => api.get(`/meetings/${id}/`),
  create: (data) => api.post('/meetings/', data),
  update: (id, data) => api.patch(`/meetings/${id}/`, data),
  delete: (id) => api.delete(`/meetings/${id}/`),
  rate: (id, data) => api.post(`/meetings/${id}/rate/`, data),
  addParticipant: (id, userId) => api.post(`/meetings/${id}/participants/${userId}/`),
  removeParticipant: (id, userId) => api.delete(`/meetings/${id}/participants/${userId}/`),
}

export const notificationsApi = {
  list: (params) => api.get('/notifications/', { params }),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
}

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard/'),
  tasks: (params) => api.get('/reports/tasks/', { params }),
  productivity: (params) => api.get('/reports/productivity/', { params }),
  export: (params) => api.get('/reports/export/', { params, responseType: 'blob' }),
}

export const hrApi = {
  employees: (params) => api.get('/hr/employees/', { params }),
  getEmployee: (id) => api.get(`/hr/employees/${id}/`),
  updateEmployee: (id, data) => api.patch(`/hr/employees/${id}/`, data),
  departments: () => api.get('/hr/departments/'),
}

export const rewardsApi = {
  list: (params) => api.get('/rewards/', { params }),
  create: (data) => api.post('/rewards/', data),
  leaderboard: () => api.get('/rewards/leaderboard/'),
  myRewards: () => api.get('/rewards/my/'),
}

export const chatApi = {
  rooms: () => api.get('/chat/rooms/'),
  messages: (roomId) => api.get(`/chat/rooms/${roomId}/messages/`),
  broadcast: (data) => api.post('/chat/rooms/broadcast/', data),
  getOrCreateDirectRoom: (userId) => api.post('/chat/rooms/get-or-create-direct/', { user_id: userId }),
}

export const createChatSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = `${window.location.hostname}:8001`
  return new WebSocket(`${protocol}//${host}/`)
}
