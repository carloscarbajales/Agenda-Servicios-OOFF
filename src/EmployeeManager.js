import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function EmployeeManager({ profile }) {
  const [employees, setEmployees] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filtro visual para ver bajas
  const [showInactive, setShowInactive] = useState(false); 
  // Estado para el modal de Edición
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Formulario Crear
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('empleado')
  const [newPharmacyId, setNewPharmacyId] = useState('')
  
  // Campos para Login (Crear)
  const [hasLogin, setHasLogin] = useState(false) 
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadData() {
    setLoading(true)
    let pharmacyQuery = supabase.from('pharmacies').select('*')
    let employeeQuery = supabase.from('profiles').select('*, pharmacies(id, name)')

    // Lógica de carga según rol
    if (profile.role !== 'admin' && profile.role !== 'gestor') {
      const myPharmacyId = profile.pharmacy_id
      if (myPharmacyId) {
        pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId)
        employeeQuery = employeeQuery.eq('pharmacy_id', myPharmacyId)
        setNewPharmacyId(myPharmacyId)
      } else {
          setLoading(false); return;
      }
    }
    
    try {
      const [pharmacyRes, employeeRes] = await Promise.all([pharmacyQuery, employeeQuery])
      setPharmacies(pharmacyRes.data || [])
      setEmployees((employeeRes.data || []).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      
      // Auto-selección para Admin/Gestor
      if ((profile.role === 'admin' || profile.role === 'gestor') && pharmacyRes.data?.length > 0 && !newPharmacyId) {
        // Opcional: setNewPharmacyId(pharmacyRes.data[0].id)
      }
    } catch (error) { console.error(error); } finally { setLoading(false) }
  }

  // --- Métricas (Horas/Días) ---
  const handleMetricChange = (id, f, v) => setEmployees(prev => prev.map(e => e.id === id ? {...e, [f]: v} : e));
  
  const handleSaveMetric = async (id, f, v) => { 
      const val = v === '' ? 0 : parseFloat(v);
      // Guardado directo sin .select() para evitar bloqueos de RLS silenciosos en lectura
      const { error } = await supabase.from('profiles').update({ [f]: val }).eq('id', id);
      if(error) { alert("Error al guardar: " + error.message); loadData(); } 
  }

  // --- Estado (Baja/Alta) ---
  const handleToggleStatus = async (id, status, name) => { 
      const action = status ? "Dar de baja" : "Reactivar";
      if (!window.confirm(`¿${action} a ${name}?`)) return;

      setActionLoading(true);
      const { error } = await supabase.from('profiles').update({active: !status}).eq('id', id);
      
      if (error) {
          alert("Error al cambiar estado: " + error.message);
      } else {
          // Actualización local rápida
          setEmployees(prev => prev.map(e => e.id === id ? {...e, active: !status} : e));
      }
      setActionLoading(false);
  }

  // --- CREAR ---
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName || !newRole) { alert('Faltan datos.'); return; }
    
    // Validación Farmacia: Obligatoria solo para Gerente y Empleado
    const pharmacyRequired = ['gerente', 'empleado'].includes(newRole);
    if (pharmacyRequired && !newPharmacyId) {
        alert(`Para el rol de ${newRole} es obligatorio asignar una Farmacia.`); return;
    }

    if (hasLogin && (!newEmail || !newPassword)) { alert('Email/Pass requeridos para login.'); return; }

    setActionLoading(true);
    try {
        const pharmacyIdToSend = newPharmacyId ? parseInt(newPharmacyId) : null;

        if (hasLogin) {
            const { error } = await supabase.functions.invoke('manage-employees', {
              body: { action: 'create', email: newEmail, password: newPassword, full_name: newName, role: newRole, pharmacy_id: pharmacyIdToSend }
            })
            if (error) throw error;
            alert(`Usuario "${newName}" creado con login.`);
        } else {
            const { error } = await supabase.from('profiles').insert({
                id: crypto.randomUUID(), full_name: newName, role: newRole, pharmacy_id: pharmacyIdToSend,
                counter_hours: 0, days_worked: 0, active: true
            });
            if (error) throw error;
            alert('Empleado local creado.');
        }
        setNewName(''); setNewEmail(''); setNewPassword(''); setHasLogin(false); 
        // No reseteamos newPharmacyId si no es admin, para comodidad
        if(profile.role === 'admin' || profile.role === 'gestor') setNewPharmacyId('');
        
        loadData();
    } catch (error) { alert('Error: ' + error.message); } 
    finally { setActionLoading(false); }
  }

  // --- ACTUALIZAR (Modal) ---
  const handleUpdateEmployee = async (e) => {
      e.preventDefault();
      if (!editingEmployee) return;
      setActionLoading(true);
      try {
          const pharmacyIdToSend = editingEmployee.pharmacy_id ? parseInt(editingEmployee.pharmacy_id) : null;
          
          const payload = {
              action: 'update',
              userId: editingEmployee.id,
              full_name: editingEmployee.full_name,
              pharmacy_id: pharmacyIdToSend,
              role: editingEmployee.role 
          };
          if (editingEmployee.new_password) payload.password = editingEmployee.new_password;
          if (editingEmployee.new_email) payload.email = editingEmployee.new_email;

          const { error } = await supabase.functions.invoke('manage-employees', { body: payload });
          
          if (error) {
             console.warn("Fallback update local...", error);
             await supabase.from('profiles').update({
                 full_name: editingEmployee.full_name,
                 pharmacy_id: pharmacyIdToSend
             }).eq('id', editingEmployee.id);
          }
          alert("Actualizado."); setEditingEmployee(null); loadData();
      } catch(e) { alert(e.message); }
      finally { setActionLoading(false); }
  }

  const handleResetPassword = async (id, name) => {
    if (!window.confirm(`Resetear password de ${name}?`)) return;
    try { await supabase.functions.invoke('reset-employee-password', {body:{employee_id:id}}); alert("Email enviado."); } catch(e){alert(e.message)}
  }


  if (loading) return <p>Cargando...</p>;
  const visibleEmployees = showInactive ? employees : employees.filter(e => e.active !== false);
  
  // Permisos: 
  const canManageAll = ['admin', 'gestor'].includes(profile.role);
  // isManager incluye también a Gerente
  const isManager = ['admin', 'gestor', 'gerente'].includes(profile.role);

  return (
    <div className="employee-manager">
      {/* Formulario Alta */}
      {(profile.role !== 'empleado') && (
        <form onSubmit={handleCreate} className="service-form">
          <h3>Alta de Personal</h3>
          <div className="form-grid">
            <div><label>Nombre</label><input type="text" value={newName} onChange={e=>setNewName(e.target.value)} required placeholder="Nombre" /></div>
            
            <div><label>Rol</label>
               <select value={newRole} onChange={e=>{
                   setNewRole(e.target.value);
                   if(['admin','gestor','gerente'].includes(e.target.value)) setHasLogin(true);
               }} disabled={!canManageAll}>
                 <option value="empleado">Empleado</option>
                 <option value="gerente">Gerente</option>
                 {/* Solo Admin puede crear Gestores o Admins */}
                 {profile.role === 'admin' && <><option value="gestor">Gestor</option><option value="admin">Admin</option></>}
               </select>
             </div>

             <div><label>Farmacia {['gerente','empleado'].includes(newRole) ? '*' : '(Opcional)'}</label>
               <select value={newPharmacyId} onChange={e=>setNewPharmacyId(e.target.value)} disabled={!canManageAll}>
                 {/* Si es Admin/Gestor, mostramos todas + opción vacía */}
                 {canManageAll ? (
                     <>
                        <option value="">-- Sin Asignación (Global) --</option>
                        {pharmacies.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                     </>
                 ) : ( 
                    /* Si es Gerente, solo ve su farmacia bloqueada */
                    pharmacies.length > 0 ? <option value={pharmacies[0].id}>{pharmacies[0].name}</option> : <option disabled>--</option> 
                 )}
               </select>
             </div>
             
             <div style={{gridColumn: '1 / -1', background:'#f9f9f9', padding:10, borderRadius:8}}>
                 <label style={{display:'flex',gap:5,cursor:'pointer'}}><input type="checkbox" checked={hasLogin} onChange={e=>setHasLogin(e.target.checked)}/><strong>Con Login</strong></label>
                 {(hasLogin) && <div style={{display:'flex',gap:15,marginTop:5}}><input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Email" style={{flex:1}}/><input type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Clave" style={{flex:1}}/></div>}
            </div>
            <button type="submit" className="button" disabled={actionLoading}>Crear</button>
          </div>
        </form>
      )}

      <hr />
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
          <h3>Plantilla</h3>
          <label style={{cursor:'pointer'}}><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Ver Bajas</label>
      </div>
      
      <table className="service-table">
        <thead><tr><th>Nombre</th><th>Rol</th>{(profile.role!=='gerente')&&<th>Farmacia</th>}<th>Horas</th><th>Días</th><th>Total</th><th>Acciones</th></tr></thead>
        <tbody>
          {visibleEmployees.map((emp) => {
             const isActive = emp.active !== false; 
             return (
                <tr key={emp.id} style={!isActive ? {background:'#ffebee'} : {}}>
                  <td>{emp.full_name}</td>
                  <td>
                      {emp.role}
                      {!isActive && <span style={{color:'red', fontWeight:'bold', marginLeft:5}}>(BAJA)</span>}
                  </td>
                  {(profile.role!=='gerente') && <td>{emp.pharmacies?.name || <span style={{color:'#999'}}>Global</span>}</td>}
                  <td><input type="number" className="assignment-input" value={emp.counter_hours??''} onChange={e=>handleMetricChange(emp.id, 'counter_hours', e.target.value)} onBlur={e=>handleSaveMetric(emp.id, 'counter_hours', e.target.value)} disabled={!isActive}/></td>
                  <td><input type="number" className="assignment-input" value={emp.days_worked??''} onChange={e=>handleMetricChange(emp.id, 'days_worked', e.target.value)} onBlur={e=>handleSaveMetric(emp.id, 'days_worked', e.target.value)} disabled={!isActive}/></td>
                  <td>{(emp.counter_hours||0)*(emp.days_worked||0)}h</td>
                  <td className="actions-cell">
                    {(isManager && isActive) && 
                        <button className="button-secondary" onClick={() => setEditingEmployee({...emp, new_password: '', new_email: ''})}>Editar</button>
                    }
                    {(isManager && isActive && ['admin','gestor','gerente'].includes(emp.role)) && 
                        <button className="button-secondary" onClick={()=>handleResetPassword(emp.id, emp.full_name)}>Reset</button>
                    }
                    
                    {/* Botón Baja/Alta */}
                    {(isManager && emp.id!==profile.id) && 
                        <button className={isActive ? "button-delete" : "button"} onClick={()=>handleToggleStatus(emp.id, isActive, emp.full_name)}>
                            {isActive ? 'Baja' : 'Alta'}
                        </button>
                    }
                  </td>
                </tr>
             )
          })}
        </tbody>
      </table>

      {/* Modal Edición */}
      {editingEmployee && (
        <div className="modal-backdrop" onClick={()=>setEditingEmployee(null)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <h3>Editar: {editingEmployee.full_name}</h3>
            <form onSubmit={handleUpdateEmployee}>
                <div className="form-group"><label>Nombre</label><input type="text" value={editingEmployee.full_name} onChange={e=>setEditingEmployee({...editingEmployee, full_name:e.target.value})} required/></div>
                {canManageAll && (
                    <div className="form-group"><label>Farmacia</label><select value={editingEmployee.pharmacy_id||''} onChange={e=>setEditingEmployee({...editingEmployee, pharmacy_id:e.target.value})}>
                        <option value="">-- Sin Asignación (Global) --</option>
                        {pharmacies.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></div>
                )}
                <div className="form-group" style={{marginTop:15, borderTop:'1px dashed #ccc', paddingTop:10}}>
                    <label style={{color:'#d35400'}}>Cambiar Credenciales (Opcional)</label>
                    <input type="email" placeholder="Nuevo Email (si aplica)" value={editingEmployee.new_email || ''} onChange={e=>setEditingEmployee({...editingEmployee, new_email:e.target.value})} style={{marginBottom:5}}/>
                    <input type="text" placeholder="Nueva Contraseña" value={editingEmployee.new_password} onChange={e=>setEditingEmployee({...editingEmployee, new_password:e.target.value})}/>
                    <small>Deja vacío si no quieres cambiar nada.</small>
                </div>
                <div className="modal-actions">
                    <button type="button" className="button-secondary" onClick={()=>setEditingEmployee(null)}>Cancelar</button>
                    <button type="submit" className="button" disabled={actionLoading}>Guardar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}