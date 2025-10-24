import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function EmployeeManager({ profile }) {
  const [employees, setEmployees] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados para el formulario de "Invitar Empleado"
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('empleado') // 'empleado' por defecto
  const [newPharmacyId, setNewPharmacyId] = useState('')

  useEffect(() => {
    loadData()
  }, [profile])

  async function loadData() {
    setLoading(true)
    let pharmacyQuery = supabase.from('pharmacies').select('*')
    let employeeQuery = supabase.from('profiles').select('*, pharmacies(name)')

    // --- LÓGICA DE ROLES ---
    if (profile.role !== 'admin') {
      const myPharmacyId = profile.pharmacy_id

      pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId)
      employeeQuery = employeeQuery.eq('pharmacy_id', myPharmacyId)
      setNewPharmacyId(myPharmacyId)
    }

    const [pharmacyData, employeeData] = await Promise.all([
      pharmacyQuery,
      employeeQuery,
    ])

    if (pharmacyData.data) {
      setPharmacies(pharmacyData.data)
      if (profile.role === 'admin' && pharmacyData.data.length > 0 && !newPharmacyId) {
        setNewPharmacyId(pharmacyData.data[0].id)
      }
    }
    if (employeeData.data) {
      setEmployees(employeeData.data)
    }
    setLoading(false)
  }

  // --- Manejador para INVITAR un empleado ---
  const handleInviteEmployee = async (e) => {
    e.preventDefault()

    if (!newEmail || !newName || !newRole || !newPharmacyId) {
      alert('Todos los campos son obligatorios.')
      return
    }

    const { error } = await supabase.functions.invoke('invite-employee', {
      body: {
        email: newEmail,
        full_name: newName,
        role: newRole,
        pharmacy_id: newPharmacyId,
      },
    })

    if (error) {
      alert('Error al invitar al empleado: ' + error.message)
    } else {
      alert('¡Invitación enviada con éxito!')
      setNewEmail('')
      setNewName('')
      loadData()
    }
  }

  const handleResetPassword = (userId) => {
    alert('Función "Resetear Contraseña" aún no implementada.')
  }
  const handleDeleteEmployee = (userId) => {
    alert('Función "Borrar Empleado" aún no implementada.')
  }

  if (loading) {
    return <p>Cargando gestión de empleados...</p>
  }

  return (
    <div className="employee-manager">
      {/* --- Formulario de INVITACIÓN --- */}
      <form onSubmit={handleInviteEmployee} className="service-form">
        <h3>Invitar Nuevo Empleado</h3>
        <div className="form-grid">
          <div>
            <label htmlFor="e-name">Nombre Completo</label>
            <input
              id="e-name" type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="e-email">Email</label>
            <input
              id="e-email" type="email" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>

          {/* --- CAMPO CONDICIONAL: ROL (CORREGIDO) --- */}
          {profile.role === 'admin' ? (
            <div>
              <label htmlFor="e-role">Rol</label>
              <select
                id="e-role" value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                required
              >
                <option value="empleado">Empleado</option>
                <option value="gerente">Gerente</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ) : (
             null // <-- ¡AQUÍ ESTABA EL ERROR!
          )}

          {/* --- CAMPO CONDICIONAL: FARMACIA (CORREGIDO) --- */}
          {profile.role === 'admin' ? (
            <div>
              <label htmlFor="e-pharmacy">Farmacia</label>
              <select
                id="e-pharmacy" value={newPharmacyId}
                onChange={(e) => setNewPharmacyId(e.target.value)}
                required
              >
                <option value="" disabled>-- Asignar a farmacia --</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
             null // <-- ¡Y AQUÍ ESTABA EL OTRO ERROR!
          )}

          <button type="submit" className="button">Enviar Invitación</button>
        </div>
      </form>

      {/* --- Tabla de Empleados EXISTENTES --- */}
      <hr />
      <h3>Empleados Existentes</h3>
      <table className="service-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Rol</th>
            {profile.role === 'admin' && <th>Farmacia</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr><td colSpan={profile.role === 'admin' ? 4 : 3}>No hay empleados en esta farmacia.</td></tr>
          ) : (
            employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.full_name}</td>
                <td>{emp.role}</td>
                {profile.role === 'admin' && (
                  <td>{emp.pharmacies?.name || 'N/A'}</td>
                )}
                <td className="actions-cell">
                  <button
                    className="button-secondary"
                    onClick={() => handleResetPassword(emp.id)}
                  >
                    Reset Pass
                  </button>
                  <button
                    className="button-delete"
                    onClick={() => handleDeleteEmployee(emp.id)}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}