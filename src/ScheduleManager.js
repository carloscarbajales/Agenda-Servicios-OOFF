import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Días de la semana
const weekDays = [
 { name: 'Domingo', id: 0 }, { name: 'Lunes', id: 1 }, { name: 'Martes', id: 2 },
 { name: 'Miércoles', id: 3 }, { name: 'Jueves', id: 4 }, { name: 'Viernes', id: 5 },
 { name: 'Sábado', id: 6 },
];

// Opciones para las semanas del mes
const monthWeeks = [1, 2, 3, 4, 5];

export default function ScheduleManager({ profile }) {
  // --- Estados ---
  const [allServices, setAllServices] = useState([]) // TODOS los servicios (para admin/gestor)
  const [services, setServices] = useState([]) // Servicios FILTRADOS a mostrar/usar en form
  const [allSchedules, setAllSchedules] = useState([]) // TODOS los horarios (para admin/gestor)
  const [schedules, setSchedules] = useState([]) // Horarios FILTRADOS a mostrar en tabla
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false); // Para botones Crear/Borrar

  // Estado Farmacia Seleccionada
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');

  // Estados Formulario
  const [serviceId, setServiceId] = useState('')
  const [scheduleType, setScheduleType] = useState('recurrent')
  const [selectedDays, setSelectedDays] = useState([])
  // Estado para semanas seleccionadas
  const [selectedWeeks, setSelectedWeeks] = useState([]) 
  const [specificDate, setSpecificDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')

  // --- Carga Inicial ---
  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // --- REFILTRA cuando cambia la farmacia SELECCIONADA ---
  useEffect(() => {
      // Solo si eres admin/gestor y CAMBIA la farmacia
      if ((profile.role === 'admin' || profile.role === 'gestor')) {
          console.log("Debug Schedule: useEffect [selectedPharmacyId] changed to:", selectedPharmacyId);
          // Filtra usando los datos brutos YA CARGADOS
          filterDataByPharmacy(selectedPharmacyId, allServices, allSchedules);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPharmacyId]); // Depende SOLO de la selección

 // --- Carga TODOS los datos que el usuario puede ver ---
  async function loadInitialData() {
      setLoading(true);
      console.log("Debug Schedule: loadInitialData...");

      let pharmacyQuery = supabase.from('pharmacies').select('*');
      let serviceQuery = supabase.from('services').select('*'); // Carga todos los visibles por RLS
      let scheduleQuery = supabase.from('service_schedule').select('*, services!inner(id, name)'); // Carga todos los visibles por RLS

      // Filtros específicos para GERENTE/EMPLEADO en la QUERY
      if (profile.role !== 'admin' && profile.role !== 'gestor') {
          // ... (filtros .eq('pharmacy_id', ...) para gerente/empleado) ...
          if(!profile.pharmacy_id){ setLoading(false); return;}
          const myPharmacyId = profile.pharmacy_id;
          pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId);
          serviceQuery = serviceQuery.eq('pharmacy_id', myPharmacyId);
          scheduleQuery = scheduleQuery.eq('services.pharmacy_id', myPharmacyId);
          setSelectedPharmacyId(myPharmacyId.toString()); // Guarda su ID
      }

      try {
          const [pharmacyRes, serviceRes, scheduleRes] = await Promise.all([
              pharmacyQuery, serviceQuery, scheduleQuery
          ]);
          if (pharmacyRes.error) throw pharmacyRes.error;
          if (serviceRes.error) throw serviceRes.error;
          if (scheduleRes.error) throw scheduleRes.error;

          const loadedPharmacies = pharmacyRes.data || [];
          const loadedServices = serviceRes.data || [];
          const loadedSchedules = scheduleRes.data || [];

          setPharmacies(loadedPharmacies);
          
          if (profile.role === 'admin' || profile.role === 'gestor') {
              setAllServices(loadedServices);
              setAllSchedules(loadedSchedules);
              let currentSelection = selectedPharmacyId;
              if (!currentSelection && loadedPharmacies.length > 0) {
                  currentSelection = loadedPharmacies[0].id.toString();
                  setSelectedPharmacyId(currentSelection);
              } else if (currentSelection) {
                   filterDataByPharmacy(currentSelection, loadedServices, loadedSchedules);
              } else { setServices([]); setSchedules([]); setServiceId(''); }
          } else {
              setServices(loadedServices);
              setSchedules(loadedSchedules);
              setServiceId(loadedServices.length > 0 ? loadedServices[0].id.toString() : '');
          }

      } catch (error) { alert("Error al cargar datos: " + error.message); } 
      finally { setLoading(false); }
  }

  // --- Filtra los datos brutos por la farmacia seleccionada ---
  const filterDataByPharmacy = (pharmacyId, servicesToFilter = allServices, schedulesToFilter = allSchedules) => {
      console.log(`Debug Schedule: filterDataByPharmacy para ID: ${pharmacyId}`);
      const pharmacyServices = servicesToFilter.filter(s => s.pharmacy_id?.toString() === pharmacyId?.toString());
      setServices(pharmacyServices);

      const firstServiceId = pharmacyServices.length > 0 ? pharmacyServices[0].id.toString() : '';
      if (firstServiceId !== serviceId) { setServiceId(firstServiceId); }

      const pharmacySchedules = schedulesToFilter.filter(sch =>
          pharmacyServices.some(ps => ps.id === sch.service_id)
      );
      setSchedules(pharmacySchedules);
      console.log(`  -> Filter Results: Servicios ${pharmacyServices.length}, Horarios ${pharmacySchedules.length}`);
  }

  async function reloadAllData() {
       setActionLoading(true);
       await loadInitialData();
       setActionLoading(false);
  }

  const handleDayChange = (dayId) => {
      setSelectedDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
  }
  // Manejador Semanas
  const handleWeekChange = (weekNum) => {
      setSelectedWeeks(prev => prev.includes(weekNum) ? prev.filter(w => w !== weekNum) : [...prev, weekNum]);
  }

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!serviceId) { alert('Selecciona un servicio.'); return; }
    
    let inserts = [];
    if (scheduleType === 'recurrent') {
        if (selectedDays.length === 0) { alert('Selecciona al menos un día.'); return; }
        const weeksToInsert = selectedWeeks.length > 0 ? selectedWeeks : [null];
        selectedDays.forEach(day => {
            weeksToInsert.forEach(week => {
                inserts.push({
                    service_id: serviceId,
                    day_of_week: day,
                    week_number: week,
                    start_time: startTime,
                    end_time: endTime,
                    is_recurrent: true,
                });
            });
        });
    } else {
        if (!specificDate) { alert('Selecciona fecha.'); return; }
        inserts.push({ service_id: serviceId, specific_date: specificDate, start_time: startTime, end_time: endTime, is_recurrent: false });
    }

    try {
        setActionLoading(true);
        const { error } = await supabase.from('service_schedule').insert(inserts);
        if (error) throw error;
        alert('¡Horario/s creado/s!');
        setSelectedDays([]); setSelectedWeeks([]); setSpecificDate('');
        await reloadAllData();
    } catch (error) { alert('Error: ' + error.message); setActionLoading(false); }
  }

  const handleDeleteSchedule = async (scheduleId) => {
     if (!window.confirm('¿Borrar tramo horario?')) return;
     try {
         setActionLoading(true);
         const { error } = await supabase.from('service_schedule').delete().eq('id', scheduleId);
         if (error) throw error;
         alert('Horario borrado.');
         await reloadAllData();
     } catch (error) { alert('Error: ' + error.message); setActionLoading(false); }
  }

  const formatSchedule = (s) => {
      const timePart = `de ${s.start_time?.substring(0,5)} a ${s.end_time?.substring(0,5)}`;
      if (s.is_recurrent) {
        const dayName = weekDays.find(d => d.id === s.day_of_week)?.name;
        let weekPart = "";
        if (s.week_number) {
            weekPart = `(Semana ${s.week_number}ª)`;
        } else {
            weekPart = "(Todas las semanas)";
        }
        return `RECURRENTE: ${dayName} ${weekPart} ${timePart}`;
      } else {
        return `PUNTUAL: ${s.specific_date} ${timePart}`;
      }
  };

  if (loading) return <p>Cargando gestión de horarios...</p>;

  return (
    <div className="schedule-manager">
      <form onSubmit={handleCreateSchedule} className="service-form">
        <h3>Crear Nuevo Horario</h3>
        <div className="form-grid">

          {(profile.role === 'admin' || profile.role === 'gestor') && (
              <div><label>Farmacia</label><select value={selectedPharmacyId} onChange={e => setSelectedPharmacyId(e.target.value)} required>{pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          )}

          {/* Selector Servicio */}
          <div>
            <label>Servicio</label>
            <select value={serviceId || ''} onChange={e => setServiceId(e.target.value)} disabled={!selectedPharmacyId && (profile.role === 'admin' || profile.role === 'gestor')} required>
              <option value="" disabled>
                  {!selectedPharmacyId && (profile.role === 'admin' || profile.role === 'gestor') ? '-- Selecciona Farmacia --' : '-- Selecciona Servicio --'}
              </option>
              {/* Usamos 'services' que es el estado correcto */}
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              {services.length === 0 && selectedPharmacyId && <option value="" disabled>No hay servicios</option>}
            </select>
          </div>
          
          <div><label>Tipo Horario</label><select value={scheduleType} onChange={e => setScheduleType(e.target.value)}><option value="recurrent">Recurrente</option><option value="punctual">Puntual</option></select></div>

          {scheduleType === 'recurrent' ? (
            <>
                <div className="day-selector">
                  <label>Días Semana</label>
                  <div className="checkbox-group">
                      {weekDays.map(day => ( <label key={day.id}><input type="checkbox" value={day.id} checked={selectedDays.includes(day.id)} onChange={() => handleDayChange(day.id)} /> {day.name.substring(0,3)} </label> ))}
                  </div>
                </div>
                <div className="day-selector">
                  <label>Repetición Mensual (Dejar vacío para todas)</label>
                  <div className="checkbox-group">
                      {monthWeeks.map(week => ( 
                          <label key={week}>
                              <input type="checkbox" value={week} checked={selectedWeeks.includes(week)} onChange={() => handleWeekChange(week)} /> 
                              {week}ª Semana
                          </label> 
                      ))}
                  </div>
                </div>
            </>
          ) : (
            <div><label>Fecha Específica</label><input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} required={scheduleType === 'punctual'} /></div>
          )}

          <div><label>Hora Inicio</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required/></div>
          <div><label>Hora Fin</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required/></div>

          <button type="submit" className="button" disabled={!serviceId || actionLoading || loading}>{actionLoading ? 'Guardando...' : 'Crear Horario'}</button>
        </div>
      </form>

      <hr />
      <h3>Horarios Definidos {pharmacies.find(p=>p.id?.toString() === selectedPharmacyId)?.name ? `para ${pharmacies.find(p=>p.id?.toString() === selectedPharmacyId)?.name}` : '(Selecciona farmacia)'}</h3>
      <table className="service-table">
        <thead><tr><th>Servicio</th><th>Definición</th><th>Acciones</th></tr></thead>
        <tbody>
          {schedules.length === 0 ? (<tr><td colSpan="3">No hay horarios.</td></tr>) : (
            schedules.map(s => (
              <tr key={s.id}>
                <td>{s.services?.name}</td>
                <td>{formatSchedule(s)}</td>
                <td className="actions-cell"><button className="button-delete" onClick={() => handleDeleteSchedule(s.id)} disabled={actionLoading}>Borrar</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}