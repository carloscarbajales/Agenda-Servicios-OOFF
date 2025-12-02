import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function EmployeeAssignmentManager({ profile }) {
  const [employees, setEmployees] = useState([])
  const [services, setServices] = useState([])
  const [objectives, setObjectives] = useState([])
  const [assignments, setAssignments] = useState({}) 
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadData() {
    setLoading(true)
    let pharmacyId = profile.pharmacy_id
    
    // Cargar empleados, servicios y objetivos de la farmacia
    let empQuery = supabase.from('profiles').select('*').eq('role', 'empleado')
    let servQuery = supabase.from('services').select('*')
    let objQuery = supabase.from('objectives').select('*')
    let assignQuery = supabase.from('employee_assignments').select('*')

    if (profile.role !== 'admin') {
      if (pharmacyId) {
        empQuery = empQuery.eq('pharmacy_id', pharmacyId)
        servQuery = servQuery.eq('pharmacy_id', pharmacyId)
        objQuery = objQuery.eq('pharmacy_id', pharmacyId)
        // assignQuery se filtra indirectamente por RLS
      } else if (profile.role === 'gestor') {
        console.warn("Gestor: Carga multi-farmacia pendiente para asignaciones.")
      } else { 
        return setLoading(false) 
      }
    }

    try {
        const [empRes, servRes, objRes, assignRes] = await Promise.all([
            empQuery, servQuery, objQuery, assignQuery
        ])

        if (empRes.data) setEmployees(empRes.data)
        if (servRes.data) setServices(servRes.data)
        if (objRes.data) setObjectives(objRes.data)
        
        if (assignRes.data) {
            const initialAssignments = {}
            assignRes.data.forEach(a => {
                // Guardamos estructura compuesta: { total: X, new: Y }
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

  // --- ALGORITMO DE REPARTO AUTOMÁTICO ---
  const handleAutoDistribute = async () => {
      if (!window.confirm("¿Recalcular objetivos automáticamente basándose en horas/días de mostrador? Esto sobrescribirá los valores actuales.")) return;

      const updates = [];
      const newAssignmentsState = { ...assignments };

      // 1. Calcular la "Fuerza de Trabajo Total" de la farmacia (Suma de coeficientes)
      // Coeficiente = Horas diarias * Días al mes
      const totalWorkForce = employees.reduce((sum, emp) => sum + ((emp.counter_hours || 0) * (emp.days_worked || 0)), 0);

      if (totalWorkForce === 0) {
          alert("No hay horas/días definidos para los empleados. Configúralo en 'Gestión de Empleados' primero.");
          return;
      }

      // 2. Para cada servicio...
      services.forEach(service => {
          // Obtener el objetivo global de la farmacia para este servicio (definido en el paso anterior)
          const objective = objectives.find(o => o.service_id === service.id);
          const totalTarget = objective?.target_appointments || 0;
          
          // Obtener el % de nuevos deseado para este servicio (configurado en ServiceManager)
          const pctNew = service.target_new_clients_pct || 0;

          // 3. Repartir entre empleados según su peso en la fuerza de trabajo
          employees.forEach(emp => {
              const empWorkForce = (emp.counter_hours || 0) * (emp.days_worked || 0);
              const share = empWorkForce / totalWorkForce; // % de participación del empleado (ej. 0.33 para 33%)

              // Objetivo Individual Total (Redondeado)
              // Ej: Si el objetivo global es 100 y mi share es 0.33, mi objetivo es 33.
              const empTotalTarget = Math.round(totalTarget * share);
              
              // Objetivo Individual Nuevos (% sobre el total asignado al empleado)
              // Ej: Si mi objetivo total es 33 y el % de nuevos del servicio es 20%, mi objetivo de nuevos es 7.
              const empNewTarget = Math.round(empTotalTarget * (pctNew / 100));

              // Preparar actualización para la BD
              updates.push({
                  employee_id: emp.id,
                  service_id: service.id,
                  assigned_services_count: empTotalTarget,
                  target_new_clients: empNewTarget // Guardamos también el objetivo de nuevos
              });
              
              // Actualizar estado local para feedback inmediato en la tabla
              newAssignmentsState[`${emp.id}-${service.id}`] = { total: empTotalTarget, new: empNewTarget };
          });
      });

      // 4. Guardar en bloque (Upsert masivo)
      const { error } = await supabase.from('employee_assignments').upsert(updates, { onConflict: 'employee_id, service_id' });

      if (error) alert("Error al distribuir: " + error.message);
      else {
          setAssignments(newAssignmentsState);
          alert("¡Objetivos redistribuidos correctamente en base a la carga de trabajo!");
      }
  }

  if (loading) return <p>Cargando asignaciones...</p>
  if (profile.role === 'empleado') return null // Los empleados no ven esto

  return (
    <div className="assignment-manager">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px', marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
          <h3>Reparto de Objetivos</h3>
          <button className="button" onClick={handleAutoDistribute}>🔄 Reparto Automático (según Horas)</button>
      </div>
      
      <table className="service-table assignment-table">
        <thead>
          <tr>
            <th>Empleado</th>
            {services.map(s => (
                <th key={s.id} style={{minWidth: '120px'}}>
                    {s.name} <br/>
                    <small style={{fontWeight:'normal', fontSize:'0.8em'}}>Obj: Total / <span style={{color:'green'}}>Nuevos</span></small>
                </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
             // Calcula el porcentaje de fuerza laboral para mostrarlo como referencia visual
             const empWorkForce = (emp.counter_hours||0)*(emp.days_worked||0);
             const totalWorkForce = employees.reduce((s,e)=>s+((e.counter_hours||0)*(e.days_worked||0)),0);
             const sharePct = totalWorkForce > 0 ? (empWorkForce / totalWorkForce * 100).toFixed(1) : 0;

             return (
                <tr key={emp.id}>
                  <td>
                      {emp.full_name} <br/>
                      <small style={{color:'#666'}}>
                          Coef: {sharePct}%
                      </small>
                  </td>
                  {services.map(s => {
                    const val = assignments[`${emp.id}-${s.id}`] || { total: 0, new: 0 };
                    return (
                      <td key={s.id} style={{textAlign:'center'}}>
                        {/* Mostramos el resultado del cálculo (o 0) */}
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
  )
}