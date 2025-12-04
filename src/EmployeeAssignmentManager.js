import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function EmployeeAssignmentManager({ profile }) {
  const [employees, setEmployees] = useState([])
  const [services, setServices] = useState([])
  const [objectives, setObjectives] = useState([])
  const [pharmacies, setPharmacies] = useState([]) // Nuevo: Lista de farmacias
  const [assignments, setAssignments] = useState({}) 
  const [loading, setLoading] = useState(true)

  // Estado de selección de farmacia
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadData() {
    setLoading(true)
    
    // Cargar Farmacias (necesario para el selector)
    let pharmQuery = supabase.from('pharmacies').select('id, name')
    if (profile.role !== 'admin' && profile.role !== 'gestor') {
         pharmQuery = pharmQuery.eq('id', profile.pharmacy_id);
         setSelectedPharmacyId(profile.pharmacy_id.toString());
    }

    // Cargar el resto de datos (sin filtrar todavía, filtraremos en memoria o recargaremos)
    let empQuery = supabase.from('profiles').select('*').eq('role', 'empleado').neq('active', false)
    let servQuery = supabase.from('services').select('*')
    let objQuery = supabase.from('objectives').select('*')
    let assignQuery = supabase.from('employee_assignments').select('*')

    try {
        const [pharmRes, empRes, servRes, objRes, assignRes] = await Promise.all([
            pharmQuery, empQuery, servQuery, objQuery, assignQuery
        ])

        if (pharmRes.data) {
            setPharmacies(pharmRes.data);
            // Autoseleccionar para Admin/Gestor si no hay selección
            if ((profile.role === 'admin' || profile.role === 'gestor') && pharmRes.data.length > 0 && !selectedPharmacyId) {
                setSelectedPharmacyId(pharmRes.data[0].id.toString());
            }
        }

        if (empRes.data) setEmployees(empRes.data)
        if (servRes.data) setServices(servRes.data)
        if (objRes.data) setObjectives(objRes.data)

        if (assignRes.data) {
            const initialAssignments = {}
            assignRes.data.forEach(a => {
                initialAssignments[`${a.employee_id}-${a.service_id}`] = {
                    total: a.assigned_services_count || 0,
                    new: a.target_new_clients || 0
                }
            })
            setAssignments(initialAssignments)
        }
    } catch (error) {
        console.error("Error cargando datos:", error)
    } finally {
        setLoading(false)
    }
  }

  // --- FILTRADO DE DATOS SEGÚN FARMACIA SELECCIONADA ---
  const visibleEmployees = employees.filter(e => !selectedPharmacyId || e.pharmacy_id.toString() === selectedPharmacyId.toString());
  const visibleServices = services.filter(s => !selectedPharmacyId || s.pharmacy_id.toString() === selectedPharmacyId.toString());

  // --- ALGORITMO DE REPARTO AUTOMÁTICO (Sobre datos filtrados) ---
  const handleAutoDistribute = async () => {
      if (!selectedPharmacyId) { alert("Selecciona una farmacia primero."); return; }
      if (!window.confirm(`¿Repartir objetivos para la farmacia seleccionada entre sus ${visibleEmployees.length} empleados activos?`)) return;

      const updates = [];
      const newAssignmentsState = { ...assignments };

      // 1. Calcular fuerza total (Solo empleados de esta farmacia)
      const totalWorkForce = visibleEmployees.reduce((sum, emp) => sum + ((emp.counter_hours || 0) * (emp.days_worked || 0)), 0);

      if (totalWorkForce === 0) {
          alert("No hay horas definidas para los empleados de esta farmacia.");
          return;
      }

      // 2. Para cada servicio DE ESTA FARMACIA...
      visibleServices.forEach(service => {
          const objective = objectives.find(o => o.service_id === service.id);
          const totalTarget = objective?.target_appointments || 0;
          const pctNew = service.target_new_clients_pct || 0;

          visibleEmployees.forEach(emp => {
              const empWorkForce = (emp.counter_hours || 0) * (emp.days_worked || 0);
              const share = empWorkForce / totalWorkForce; 

              const empTotalTarget = Math.round(totalTarget * share);
              const empNewTarget = Math.round(empTotalTarget * (pctNew / 100));

              updates.push({
                  employee_id: emp.id,
                  service_id: service.id,
                  assigned_services_count: empTotalTarget,
                  target_new_clients: empNewTarget
              });
              
              newAssignmentsState[`${emp.id}-${service.id}`] = { total: empTotalTarget, new: empNewTarget };
          });
      });

      const { error } = await supabase.from('employee_assignments').upsert(updates, { onConflict: 'employee_id, service_id' });

      if (error) alert("Error al distribuir: " + error.message);
      else {
          setAssignments(newAssignmentsState);
          alert("¡Objetivos redistribuidos correctamente!");
      }
  }

  if (loading) return <p>Cargando asignaciones...</p>
  if (profile.role === 'empleado') return null

  return (
    <div className="assignment-manager">
      <div style={{marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
          <h3>Reparto de Objetivos</h3>
          
          {/* SELECTOR DE FARMACIA (Admin/Gestor) */}
          {(profile.role === 'admin' || profile.role === 'gestor') && (
              <div style={{marginBottom: '15px'}}>
                  <label style={{marginRight: '10px', fontWeight: 'bold'}}>Seleccionar Farmacia:</label>
                  <select 
                      value={selectedPharmacyId} 
                      onChange={e => setSelectedPharmacyId(e.target.value)}
                      style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}}
                  >
                      {pharmacies.length > 1 && <option value="" disabled>-- Selecciona --</option>}
                      {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              </div>
          )}

          <div style={{textAlign: 'right', marginBottom: '10px'}}>
             <button className="button" onClick={handleAutoDistribute} disabled={!selectedPharmacyId}>🔄 Reparto Automático (según Horas)</button>
          </div>
      </div>
      
      <div className="table-wrapper">
        <table className="service-table assignment-table">
            <thead>
            <tr>
                <th style={{minWidth: '150px'}}>Empleado</th>
                {visibleServices.length === 0 ? <th>Sin servicios</th> : visibleServices.map(s => (
                    <th key={s.id} style={{minWidth: '120px', textAlign: 'center'}}>
                        {s.name} <br/>
                        <small style={{fontWeight:'normal', fontSize:'0.8em'}}>Total / <span style={{color:'green'}}>Nuevos</span></small>
                    </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {visibleEmployees.length === 0 ? <tr><td colSpan="100%">No hay empleados en esta farmacia.</td></tr> : 
             visibleEmployees.map(emp => {
                 const empWorkForce = (emp.counter_hours||0)*(emp.days_worked||0);
                 // Calculamos el total solo de los visibles para que el % sea relativo a la farmacia
                 const totalWorkForce = visibleEmployees.reduce((s,e)=>s+((e.counter_hours||0)*(e.days_worked||0)),0);
                 const sharePct = totalWorkForce > 0 ? (empWorkForce / totalWorkForce * 100).toFixed(1) : 0;

                 return (
                    <tr key={emp.id}>
                        <td>
                            {emp.full_name} <br/>
                            <small style={{color:'#666'}}>Coef: {sharePct}%</small>
                        </td>
                        {visibleServices.map(s => {
                            const val = assignments[`${emp.id}-${s.id}`] || { total: 0, new: 0 };
                            return (
                            <td key={s.id} style={{textAlign:'center'}}>
                                <strong>{val.total}</strong> / <span style={{color:'green', fontWeight:'bold'}}>{val.new}</span>
                            </td>
                            )
                        })}
                    </tr>
                 )
            })}
            </tbody>
        </table>
      </div>
    </div>
  )
}