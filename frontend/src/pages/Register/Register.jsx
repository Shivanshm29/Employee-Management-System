import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api/client'
import toast from 'react-hot-toast'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
    role: 'employee',
    department: '',
    job_title: '',
  })

  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await authApi.departments()
        // Handle paginated response if applicable
        const data = Array.isArray(res.data) ? res.data : (res.data.results || [])
        setDepartments(data)
      } catch (err) {
        console.error('Failed to fetch departments:', err)
      }
    }
    fetchDepartments()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.password2) {
      return toast.error('Passwords do not match')
    }

    setIsLoading(true)
    try {
      await register(formData)
      toast.success('Registration successful! Please login.')
      navigate('/login')
    } catch (err) {
      const errorData = err.response?.data
      if (typeof errorData === 'object') {
        Object.values(errorData).forEach(errs => {
          if (Array.isArray(errs)) {
            errs.forEach(msg => toast.error(msg))
          } else {
            toast.error(errs)
          }
        })
      } else {
        toast.error('Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-card" style={{ maxWidth: '600px' }}>
      <div className="auth-logo">
        <h1>EMS Hub</h1>
        <p>Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">First Name</label>
          <input
            type="text"
            name="first_name"
            className="form-control"
            placeholder="John"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input
            type="text"
            name="last_name"
            className="form-control"
            placeholder="Doe"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            name="username"
            className="form-control"
            placeholder="johndoe"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            name="email"
            className="form-control"

            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Job Title</label>
          <input
            type="text"
            name="job_title"
            className="form-control"
            placeholder="Software Developer"
            value={formData.job_title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Role</label>
          <select
            name="role"
            className="form-control"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Department</label>
          <select
            name="department"
            className="form-control"
            value={formData.department}
            onChange={handleChange}
            required
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            name="password"
            className="form-control"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input
            type="password"
            name="password2"
            className="form-control"
            placeholder="••••••••"
            value={formData.password2}
            onChange={handleChange}
            required
          />
        </div>

        <div className="md:col-span-2 mt-4">
          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign In</Link>
      </div>
    </div>
  )
}
