import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { hrApi, authApi } from '../../api/client'
import Modal from '../../components/Modal'

export default function HR() {
  const [activeTab, setActiveTab] = useState('employees')
  
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedEmp, setSelectedEmp] = useState(null)
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false)
  const [empForm, setEmpForm] = useState({
    role: '', department: '', job_title: '', manager: '', hourly_rate: 0,
  })

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: '', description: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [empRes, depRes] = await Promise.all([
        hrApi.employees(),
        hrApi.departments()
      ])
      setEmployees(empRes.data.results || empRes.data)
      setDepartments(depRes.data.results || depRes.data)
    } catch {
      toast.error('Failed to load HR data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleEditEmp = (emp) => {
    setSelectedEmp(emp)
    setEmpForm({
      role: emp.role,
      department: emp.department || '',
      job_title: emp.job_title || '',
      manager: emp.manager || '',
      hourly_rate: emp.hourly_rate || 0,
    })
    setIsEmpModalOpen(true)
  }

  const handleSaveEmp = async (e) => {
    e.preventDefault()
    try {
      await hrApi.updateEmployee(selectedEmp.id, empForm)
      toast.success('Employee updated')
      setIsEmpModalOpen(false)
      fetchData()
    } catch {
      toast.error('Error updating employee')
    }
  }

  const handleSaveDept = async (e) => {
    e.preventDefault()
    try {
      await authApi.createDepartment(deptForm)
      toast.success('Department created successfully')
      setIsDeptModalOpen(false)
      setDeptForm({ name: '', description: '' })
      fetchData()
    } catch {
      toast.error('Failed to create department')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>HR Management</h2>
          <p>Manage employees, roles, and departments</p>
        </div>
        {activeTab === 'departments' && (
          <button className="btn btn-primary" onClick={() => setIsDeptModalOpen(true)}>+ New Department</button>
        )}
      </div>

      <div className="card mb-4">
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('employees')}
          >
            Employees
          </button>
          <button 
            className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('departments')}
          >
            Departments
          </button>
        </div>
        
        <div className="card-body">
          {loading ? (
            <div className="loading-center"><div className="spinner"></div></div>
          ) : activeTab === 'employees' ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Job Title</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div className="flex items-center gap-2">
                           <div className="sidebar-avatar" style={{width: 28, height: 28}}>
                             {emp.full_name?.charAt(0) || '?'}
                           </div>
                           <span className="font-semibold">{emp.full_name}</span>
                        </div>
                      </td>
                      <td className="text-sm">{emp.email}</td>
                      <td><span className="badge" style={{ background: 'var(--bg-secondary)' }}>{emp.role}</span></td>
                      <td className="text-sm">{emp.job_title || '-'}</td>
                      <td className="text-sm">{emp.department_name || '-'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEditEmp(emp)}>Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.name}</td>
                      <td className="text-sm">{d.description || '-'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" disabled>Edit</button>
                      </td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr><td colSpan="3" align="center" className="p-4 text-muted">No departments configured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Employee Modal */}
      <Modal isOpen={isEmpModalOpen} onClose={() => setIsEmpModalOpen(false)} title="Manage Employee" size="md">
        <form onSubmit={handleSaveEmp}>
          <div className="modal-body">
            <h4 className="mb-4">{selectedEmp?.full_name}</h4>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-control" value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})}>
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input type="text" className="form-control" value={empForm.job_title} onChange={e => setEmpForm({...empForm, job_title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Manager</label>
              <select className="form-control" value={empForm.manager} onChange={e => setEmpForm({...empForm, manager: e.target.value})}>
                <option value="">No Manager</option>
                {employees.filter(u => u.role !== 'employee' && u.id !== selectedEmp?.id).map(u => 
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hourly Rate</label>
              <input type="number" step="0.5" className="form-control" value={empForm.hourly_rate} onChange={e => setEmpForm({...empForm, hourly_rate: e.target.value})} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsEmpModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Dept Modal */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="New Department">
        <form onSubmit={handleSaveDept}>
          <div className="modal-body">
             <div className="form-group">
                 <label className="form-label">Name</label>
                 <input type="text" className="form-control" value={deptForm.name} onChange={e=>setDeptForm({...deptForm, name: e.target.value})} required/>
             </div>
             <div className="form-group">
                 <label className="form-label">Description</label>
                 <textarea className="form-control" value={deptForm.description} onChange={e=>setDeptForm({...deptForm, description: e.target.value})} />
             </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
