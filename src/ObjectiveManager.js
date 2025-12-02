import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function ObjectiveManager({ profile }) {
  // Estado para datos de la VISTA
  const [pharmacyPotentials, setPharmacyPotentials] = useState([])
  const [services, setServices] = useState([])
  const [objectives, setObjectives] = useState([])
  const [schedules, setSchedules] = useState([]) // ¡NUEVO! Para calcular capacidad
  const [loading, setLoading] = useState(true)

  // Estado para inputs editables
  const [editablePharmacyData, setEditablePharmacyData] = useState({})

  // Estados para el formulario de asignar objetivo
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [targetAppointments, setTargetAppointments] = useState(0)
  const [capacityInfo, setCapacityInfo] = useState(0) // ¡NUEVO! Capacidad calculada

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadData() {
    setLoading(true)

    const potentialsQuery = supabase.from('pharmacy_potential_view').select('*')
    let serviceQuery = supabase.from('services').select('*')
    let objectiveQuery = supabase.from('objectives').select('*, services!inner(name)')
    // ¡NUEVO! Cargamos horarios para calcular capacidad
    let scheduleQuery = supabase.from('service_schedule').select('*')

    if (profile.role !== 'admin' && profile.pharmacy_id) {
        serviceQuery = serviceQuery.eq('pharmacy_id', profile.pharmacy_id)
        objectiveQuery = objectiveQuery.eq('pharmacy_id', profile.pharmacy_id)
        // Los horarios se filtran indirectamente al filtrar por servicio después, 
        // pero podemos filtrar por la farmacia del servicio si hicieramos un join. 
        // Para simplificar, filtramos en memoria o confiamos en RLS si está activa.
    } else if (profile.role === 'gestor') {
        console.warn("Gestor: Carga de datos multi-farmacia pendiente.");
    }

    const [potentialsRes, serviceRes, objectiveRes, scheduleRes] = await Promise.all([
      potentialsQuery, serviceQuery, objectiveQuery, scheduleQuery
    ])

    // Guardar datos de la VISTA
    if (potentialsRes.data) {
      setPharmacyPotentials(potentialsRes.data)
      const initialEditableData = {}
      potentialsRes.data.forEach(p => {
        initialEditableData[p.pharmacy_id] = {
          estimated_ops: p.estimated_ops || 0,
          conversion_rate: p.conversion_rate || 0,
        }
      })
      setEditablePharmacyData(initialEditableData)
    } else {
        setPharmacyPotentials([]); setEditablePharmacyData({});
    }

    // Guardar horarios
    if (scheduleRes.data) {
        setSchedules(scheduleRes.data);
    }

    // Cargar objetivos
    let loadedObjectives = []
    if (objectiveRes.data) {
      loadedObjectives = objectiveRes.data
      setObjectives(loadedObjectives)
    } else {
        setObjectives([]);
    }

    // Cargar servicios y actualizar input
    if (serviceRes.data) {
      setServices(serviceRes.data)
      if (serviceRes.data.length > 0) {
        const firstServiceId = serviceRes.data[0].id
        if (!selectedServiceId) {
            setSelectedServiceId(firstServiceId);
            updateTargetInput(firstServiceId, loadedObjectives);
            calculateCapacity(firstServiceId, serviceRes.data, scheduleRes.data || []); // Calcula inicial
        } else {
            updateTargetInput(selectedServiceId, loadedObjectives);
            calculateCapacity(selectedServiceId, serviceRes.data, scheduleRes.data || []); // Recalcula
        }
      } else {
         setSelectedServiceId(''); setTargetAppointments(0); setCapacityInfo(0);
      }
    } else {
        setServices([]); setSelectedServiceId(''); setTargetAppointments(0);
    }

    setLoading(false)
  }

  // --- ¡NUEVO! Lógica para calcular capacidad mensual ---
  const calculateCapacity = (serviceId, currentServices, currentSchedules) => {
      const service = currentServices.find(s => s.id.toString() === serviceId.toString());
      if (!service || !service.time_per_service) {
          setCapacityInfo(0);
          return;
      }

      // Filtra horarios para este servicio
      const mySchedules = currentSchedules.filter(sch => sch.service_id.toString() === serviceId.toString());
      
      let totalSlotsPerMonth = 0;

      mySchedules.forEach(sch => {
          // Calcula duración del turno en minutos
          const start = parseInt(sch.start_time.split(':')[0]) * 60 + parseInt(sch.start_time.split(':')[1]);
          const end = parseInt(sch.end_time.split(':')[0]) * 60 + parseInt(sch.end_time.split(':')[1]);
          const duration = end - start;

          if (duration > 0) {
              const slotsPerShift = Math.floor(duration / service.time_per_service);
              
              if (sch.is_recurrent) {
                  // Si es semanal, multiplicamos por 4 semanas al mes (aprox)
                  totalSlotsPerMonth += (slotsPerShift * 4);
              } else {
                  // Si es puntual, cuenta como 1 vez
                  // (Podríamos filtrar si la fecha está en este mes, pero simplificamos)
                  totalSlotsPerMonth += slotsPerShift; 
              }
          }
      });
      
      setCapacityInfo(totalSlotsPerMonth);
  }

  // Actualiza el input de objetivo
  const updateTargetInput = (serviceId, objectivesList) => {
    const foundObjective = objectivesList.find(o => o.service_id?.toString() === serviceId?.toString())
    setTargetAppointments(foundObjective?.target_appointments || 0)
  }
  
  // Manejador cambio de servicio
  const handleServiceChange = (e) => {
    const newServiceId = e.target.value
    setSelectedServiceId(newServiceId)
    updateTargetInput(newServiceId, objectives)
    calculateCapacity(newServiceId, services, schedules) // Recalcula capacidad al cambiar
  }

  // --- MANEJADORES DE GUARDADO ---
  const handleEditableDataChange = (pharmacyId, field, value) => {
    setEditablePharmacyData(prev => ({...prev, [pharmacyId]: { ...prev[pharmacyId], [field]: value }}));
  }
  const handleSavePharmacyData = async (pharmacyId) => {
    const dataToSave = editablePharmacyData[pharmacyId];
    const { error } = await supabase.from('pharmacies').update(dataToSave).eq('id', pharmacyId);
    if (error) alert('Error: ' + error.message)
    else { alert('¡Datos guardados!'); loadData(); }
  }
  const handleSaveTargetAppointments = async (e) => {
    e.preventDefault();
    if (!selectedServiceId) { alert("Selecciona un servicio."); return; }
    const service = services.find(s => s.id.toString() === selectedServiceId);
    if (!service) { alert("Servicio no encontrado."); return; }
    const { error } = await supabase.from('objectives').upsert({
        pharmacy_id: service.pharmacy_id, service_id: service.id,
        target_appointments: targetAppointments,
    }, { onConflict: 'pharmacy_id, service_id' });
    if (error) alert('Error: ' + error.message)
    else { alert('¡Objetivo guardado!'); loadData(); }
  }


  if (loading) return <p>Cargando...</p>

  return (
    <div className="objective-manager">

      <h3>Potencial y Objetivos de Citas</h3>
      {pharmacyPotentials.map(p => (
          <form key={p.pharmacy_id} className="service-form objective-form" onSubmit={(e) => { e.preventDefault(); handleSavePharmacyData(p.pharmacy_id); }}>
            <h4>Farmacia: {p.pharmacy_name}</h4>
            <div className="form-grid">
              <div>
                <label>Op. Estimadas</label>
                <input type="number" value={editablePharmacyData[p.pharmacy_id]?.estimated_ops ?? 0} onChange={(e) => handleEditableDataChange(p.pharmacy_id, 'estimated_ops', e.target.value)}/>
              </div>
              <div>
                <label>Tasa Conv. (%)</label>
                <input type="number" step="0.01" value={editablePharmacyData[p.pharmacy_id]?.conversion_rate ?? 0} onChange={(e) => handleEditableDataChange(p.pharmacy_id, 'conversion_rate', e.target.value)}/>
              </div>
              <div className="calculation-box"><strong>Potenciales:</strong><span>{p.potential_appointments ?? 0}</span></div>
              <button type="submit" className="button">Guardar Datos Base</button>
            </div>
          </form>
        )
      )}

      <hr />

      <h3>Asignar Objetivo de Citas por Servicio</h3>
      <form className="service-form" onSubmit={handleSaveTargetAppointments}>
         <div className="form-grid" style={{ alignItems: 'flex-end' }}>
            <div>
                <label>Servicio</label>
                <select value={selectedServiceId} onChange={handleServiceChange}>
                     <option value="" disabled>-- Selecciona --</option>
                     {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            
            {/* --- INFO BOX DE CAPACIDAD --- */}
            <div style={{ 
                background: '#e3f2fd', 
                padding: '8px', 
                borderRadius: '4px', 
                fontSize: '0.85em', 
                marginBottom: '5px',
                border: '1px solid #90caf9',
                height: '42px', // Altura fija para alinear
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}>
                <span style={{ fontWeight: 'bold', color: '#1565c0' }}>Capacidad Técnica:</span>
                <span>{capacityInfo} citas/mes</span>
            </div>
            {/* ----------------------------- */}

            <div>
                <label>Nº Citas Objetivo</label>
                <input type="number" value={targetAppointments} onChange={(e) => setTargetAppointments(e.target.value)}/>
            </div>
            <button type="submit" className="button">Asignar Objetivo</button>
         </div>
      </form>

      <div className="assigned-objectives">
          <h4>Objetivos Actuales</h4>
          <table className="service-table">
              <thead>
                  <tr>
                      <th>Servicio</th>
                      <th>Citas Objetivo Asignadas</th>
                  </tr>
              </thead>
              <tbody>
                  {objectives.length === 0 ? (
                      <tr><td colSpan="2">No hay objetivos definidos.</td></tr>
                  ) : (
                      objectives.map(obj => (
                          <tr key={`${obj.pharmacy_id}-${obj.service_id}`}>
                              <td>{obj.services?.name || `Servicio ID ${obj.service_id}`}</td>
                              <td>{obj.target_appointments || 0}</td>
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
      </div>
    </div>
  )
}