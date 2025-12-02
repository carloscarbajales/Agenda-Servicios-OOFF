import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function EmployeeManager({ profile }) {
  const [employees, setEmployees] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('empleado')
  const [newPharmacyId, setNewPharmacyId] = useState('')

  useEffect(() => { loadData() }, [profile])

  async function loadData() {
    setLoading(true)
    let pharmacyQuery = supabase.from('pharmacies').select('*')
    let employeeQuery = supabase.from('profiles').select('*, pharmacies(id, name)')

    if (profile.role !== 'admin') {
      const myPharmacyId = profile.pharmacy_id
      if (myPharmacyId) {
        pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId)
        employeeQuery = employeeQuery.eq('pharmacy_id', myPharmacyId)
        setNewPharmacyId(myPharmacyId)
      } else if (profile.role === 'gestor') { /* ... */ }
      else { setLoading(false); return; }
    }

    try {
      const [pharmacyRes, employeeRes] = await Promise.all([pharmacyQuery, employeeQuery])
      setPharmacies(pharmacyRes.data || [])
      setEmployees((employeeRes.data || []).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      
      if (profile.role === 'admin' && pharmacyRes.data?.length > 0 && !newPharmacyId) {
        setNewPharmacyId(pharmacyRes.data[0].id)
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false) }
  }

  // --- ALTA DE EMPLEADO ---
  const handleCreateOrInvite = async (e) => {
    e.preventDefault()
    if (!newName || !newRole || !newPharmacyId) { alert('Faltan datos.'); return; }

    const needsAuth = ['admin', 'gestor', 'gerente'].includes(newRole);
    if (needsAuth && !newEmail) { alert('El email es obligatorio para este rol.'); return; }

    setActionLoading(true);
    try {
        if (needsAuth) {
            // INVITACIÓN (Tiene login)
            const { error } = await supabase.functions.invoke('invite-employee', {
              body: { email: newEmail, full_name: newName, role: newRole, pharmacy_id: parseInt(newPharmacyId) }
            })
            if (error) throw error;
            alert(`Invitación enviada a ${newEmail}`);
        } else {
            // FICHA LOCAL (Sin login - Modo Quiosco)
            const { error } = await supabase.from('profiles').insert({
                id: crypto.randomUUID(), // ID Local
                full_name: newName,
                role: newRole,
                pharmacy_id: parseInt(newPharmacyId),
                counter_hours: 0, 
                days_worked: 0
            });
            if (error) throw error;
            alert('Empleado local creado correctamente.');
        }
        setNewName(''); setNewEmail(''); loadData();
    } catch (error) { alert('Error: ' + error.message); } 
    finally { setActionLoading(false); }
  }

  // --- BORRAR ---
  const handleDeleteEmployee = async (employeeId, employeeName) => {
        if (!window.confirm(`¿BORRAR a ${employeeName}?`)) return;
        setActionLoading(true);
        try {
          // 1. Intentar borrar de Auth (si existe)
          const { error } = await supabase.functions.invoke('delete-employee', { body: { employee_id: employeeId } });
          
          if (error) {
             // Si falla porque no existe en Auth (es local), borramos de la tabla manualmente
             // Comprobamos si el mensaje de error indica 404 o 'User not found'
             // (A veces viene en error.message, a veces en error.context)
             const isNotFound = error.message?.includes("not found") || (error.context && error.context.status === 404);

             if (isNotFound) {
                 console.warn("Usuario no encontrado en Auth, borrando perfil local...");
                 const { error: dbError } = await supabase.from('profiles').delete().eq('id', employeeId);
                 if (dbError) throw dbError;
                 alert('Empleado local borrado.');
             } else { throw error; }
          } else {
             alert(`Usuario borrado.`);
          }
          loadData();
        } catch (error) { alert('Error al borrar: ' + error.message); } 
        finally { setActionLoading(false); }
   }

   // --- Métrica ---
   const handleSaveMetric = async (id, field, val) => {
       const { error } = await supabase.from('profiles').update({ [field]: Number(val) }).eq('id', id);
       if(error) { alert(error.message); loadData(); }
   }
   const handleMetricChange = (id, field, val) => {
       setEmployees(prev => prev.map(e => e.id === id ? {...e, [field]: val} : e));
   }

  if (loading) return <p>Cargando...</p>;

  // Determinar si necesita email
  const roleNeedsEmail = ['admin', 'gestor', 'gerente'].includes(newRole);

  return (
    <div className="employee-manager">
      {(profile.role !== 'empleado') && (
        <form onSubmit={handleCreateOrInvite} className="service-form">
          <h3>Alta de Personal</h3>
          <div className="form-grid">
            <div><label>Nombre</label><input type="text" value={newName} onChange={e=>setNewName(e.target.value)} required /></div>
            
            <div><label>Rol</label>
               <select value={newRole} onChange={e=>setNewRole(e.target.value)} disabled={profile.role !== 'admin'}>
                 <option value="empleado">Empleado</option>
                 {profile.role === 'admin' && <><option value="gerente">Gerente</option><option value="gestor">Gestor</option><option value="admin">Admin</option></>}
               </select>
            </div>

            <div><label>Email {roleNeedsEmail?'*':''}</label>
              <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} 
                     required={roleNeedsEmail} disabled={!roleNeedsEmail} 
                     placeholder={roleNeedsEmail ? "Requerido para acceso" : "No necesario"} 
                     style={{backgroundColor: !roleNeedsEmail ? '#f0f0f0' : 'white'}}/>
            </div>

             <div><label>Farmacia</label>
               <select value={newPharmacyId} onChange={e=>setNewPharmacyId(e.target.value)} disabled={profile.role !== 'admin'}>
                 {profile.role !== 'admin' && pharmacies.length ? <option value={pharmacies[0].id}>{pharmacies[0].name}</option> : 
                    pharmacies.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
             </div>
            <button type="submit" className="button" disabled={actionLoading}>{actionLoading ? '...' : 'Guardar'}</button>
          </div>
        </form>
      )}

      <hr />
      <h3>Plantilla</h3>
      <table className="service-table">
        <thead><tr><th>Nombre</th><th>Rol</th>{(profile.role === 'admin' || profile.role === 'gestor') && <th>Farmacia</th>}<th>Horas/Día</th><th>Días/Mes</th><th>Total</th><th>Acción</th></tr></thead>
        <tbody>
          {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.full_name}</td><td>{emp.role}</td>
                {(profile.role === 'admin' || profile.role === 'gestor') && <td>{emp.pharmacies?.name}</td>}
                <td><input type="number" className="assignment-input" value={emp.counter_hours||''} onChange={e=>handleMetricChange(emp.id, 'counter_hours', e.target.value)} onBlur={e=>handleSaveMetric(emp.id, 'counter_hours', e.target.value)}/></td>
                <td><input type="number" className="assignment-input" value={emp.days_worked||''} onChange={e=>handleMetricChange(emp.id, 'days_worked', e.target.value)} onBlur={e=>handleSaveMetric(emp.id, 'days_worked', e.target.value)}/></td>
                <td>{(emp.counter_hours||0)*(emp.days_worked||0)}h</td>
                <td className="actions-cell">
                    {(profile.role === 'admin' && emp.id !== profile.id) || (profile.role === 'gerente' && emp.role === 'empleado') ? 
                       <button className="button-delete" onClick={()=>handleDeleteEmployee(emp.id, emp.full_name)} disabled={actionLoading}>Borrar</button> : null}
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}