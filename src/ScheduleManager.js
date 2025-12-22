import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const weekDays = [
 { name: 'Lunes', id: 1 }, { name: 'Martes', id: 2 }, { name: 'Miércoles', id: 3 }, 
 { name: 'Jueves', id: 4 }, { name: 'Viernes', id: 5 }, { name: 'Sábado', id: 6 }, { name: 'Domingo', id: 0 }
];
const monthWeeks = [1, 2, 3, 4, 5];

export default function ScheduleManager({ profile }) {
  const [allServices, setAllServices] = useState([]) 
  const [services, setServices] = useState([]) 
  const [allSchedules, setAllSchedules] = useState([]) 
  const [schedules, setSchedules] = useState([]) 
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');

  // Estados Formulario
  const [serviceId, setServiceId] = useState('')
  const [scheduleType, setScheduleType] = useState('recurrent')
  const [selectedDays, setSelectedDays] = useState([])
  const [selectedWeeks, setSelectedWeeks] = useState([]) 
  const [specificDate, setSpecificDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')

  // Estado Edición
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  useEffect(() => { loadInitialData(); }, [profile]);

  useEffect(() => {
      if ((profile.role === 'admin' || profile.role === 'gestor')) {
          if (Array.isArray(allServices) && Array.isArray(allSchedules)) {
              filterDataByPharmacy(selectedPharmacyId, allServices, allSchedules);
          }
      }
  }, [selectedPharmacyId]);

  async function loadInitialData() {
      setLoading(true);
      let pharmacyQuery = supabase.from('pharmacies').select('*');
      let serviceQuery = supabase.from('services').select('*');
      let scheduleQuery = supabase.from('service_schedule').select('*, services!inner(id, name, pharmacy_id)');

      if (profile.role !== 'admin' && profile.role !== 'gestor') {
          if(!profile.pharmacy_id){ setLoading(false); return;}
          const myPharmacyId = profile.pharmacy_id;
          pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId);
          serviceQuery = serviceQuery.eq('pharmacy_id', myPharmacyId);
          scheduleQuery = scheduleQuery.eq('services.pharmacy_id', myPharmacyId);
          setSelectedPharmacyId(myPharmacyId.toString());
      }

      try {
          const [pharmacyRes, serviceRes, scheduleRes] = await Promise.all([pharmacyQuery, serviceQuery, scheduleQuery]);
          if (pharmacyRes.error) throw pharmacyRes.error;
          
          setPharmacies(pharmacyRes.data || []);
          const loadedServices = serviceRes.data || [];
          const loadedSchedules = scheduleRes.data || [];
          
          if (profile.role === 'admin' || profile.role === 'gestor') {
              setAllServices(loadedServices);
              setAllSchedules(loadedSchedules);
              let currentSelection = selectedPharmacyId;
              if (!currentSelection && pharmacyRes.data.length > 0) {
                  currentSelection = pharmacyRes.data[0].id.toString();
                  setSelectedPharmacyId(currentSelection);
              } else if (currentSelection) {
                   filterDataByPharmacy(currentSelection, loadedServices, loadedSchedules);
              }
          } else {
              setServices(loadedServices);
              setSchedules(loadedSchedules);
              setServiceId(loadedServices.length > 0 ? loadedServices[0].id.toString() : '');
          }
      } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  const filterDataByPharmacy = (pharmacyId, servicesToFilter, schedulesToFilter) => {
      const safeServices = Array.isArray(servicesToFilter) ? servicesToFilter : [];
      const safeSchedules = Array.isArray(schedulesToFilter) ? schedulesToFilter : [];
      const pharmacyServices = safeServices.filter(s => s.pharmacy_id?.toString() === pharmacyId?.toString());
      setServices(pharmacyServices);

      // Si no estamos editando, resetear servicio seleccionado al cambiar farmacia
      if (!editingScheduleId) {
          const firstServiceId = pharmacyServices.length > 0 ? pharmacyServices[0].id.toString() : '';
          setServiceId(firstServiceId);
      }

      const pharmacySchedules = safeSchedules.filter(sch => pharmacyServices.some(ps => ps.id === sch.service_id));
      setSchedules(pharmacySchedules);
  }

  async function reloadAllData() {
       setActionLoading(true);
       await loadInitialData();
       setActionLoading(false);
  }

  // --- PREPARAR EDICIÓN ---
  const handleEditClick = (sch) => {
      setEditingScheduleId(sch.id);
      setServiceId(sch.service_id.toString());
      setStartTime(sch.start_time);
      setEndTime(sch.end_time);
      
      if (sch.is_recurrent) {
          setScheduleType('recurrent');
          setSelectedDays([sch.day_of_week]); // En DB es un solo día por fila
          setSelectedWeeks(sch.week_number ? [sch.week_number] : []); // Si null, array vacío (todas)
      } else {
          setScheduleType('punctual');
          setSpecificDate(sch.specific_date);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCancelEdit = () => {
      setEditingScheduleId(null);
      setSelectedDays([]); setSelectedWeeks([]); setSpecificDate('');
      // Resetear a valores por defecto
      setStartTime('09:00'); setEndTime('11:00');
  }

  // --- GUARDAR (Crear o Actualizar) ---
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!serviceId) { alert('Selecciona un servicio.'); return; }
    
    setActionLoading(true);

    try {
        if (editingScheduleId) {
            // --- ACTUALIZAR (Solo uno) ---
            // Nota: Al editar, asumimos que se modifica ESA fila concreta.
            // Si quieres cambiar un recurrente de "Semana 1" a "Semana 2", actualizamos el campo week_number.
            
            const updatePayload = {
                service_id: serviceId,
                start_time: startTime,
                end_time: endTime,
                is_recurrent: scheduleType === 'recurrent'
            };

            if (scheduleType === 'recurrent') {
                if (selectedDays.length === 0) { alert('Selecciona un día.'); setActionLoading(false); return; }
                updatePayload.day_of_week = selectedDays[0]; // Tomamos el primero si hay varios al editar
                updatePayload.week_number = selectedWeeks.length > 0 ? selectedWeeks[0] : null; 
                updatePayload.specific_date = null;
            } else {
                if (!specificDate) { alert('Selecciona fecha.'); setActionLoading(false); return; }
                updatePayload.specific_date = specificDate;
                updatePayload.day_of_week = null;
                updatePayload.week_number = null;
            }

            const { error } = await supabase.from('service_schedule').update(updatePayload).eq('id', editingScheduleId);
            if (error) throw error;
            alert('Horario actualizado.');
            handleCancelEdit();

        } else {
            // --- CREAR (Puede insertar múltiples filas) ---
            let inserts = [];
            if (scheduleType === 'recurrent') {
                if (selectedDays.length === 0) { alert('Selecciona al menos un día.'); setActionLoading(false); return; }
                const weeksToInsert = selectedWeeks.length > 0 ? selectedWeeks : [null];
                selectedDays.forEach(day => {
                    weeksToInsert.forEach(week => {
                        inserts.push({
                            service_id: serviceId, day_of_week: day, week_number: week, start_time: startTime, end_time: endTime, is_recurrent: true,
                        });
                    });
                });
            } else {
                if (!specificDate) { alert('Selecciona fecha.'); setActionLoading(false); return; }
                inserts.push({ service_id: serviceId, specific_date: specificDate, start_time: startTime, end_time: endTime, is_recurrent: false });
            }

            const { error } = await supabase.from('service_schedule').insert(inserts);
            if (error) throw error;
            alert('¡Horario/s creado/s!');
            setSelectedDays([]); setSelectedWeeks([]); setSpecificDate('');
        }
        
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

  const handleDayChange = (dayId) => {
      // Si estamos editando, forzamos selección única para simplificar lógica de update
      if (editingScheduleId) { setSelectedDays([dayId]); return; }
      setSelectedDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
  }
  const handleWeekChange = (weekNum) => {
      if (editingScheduleId) { setSelectedWeeks(prev => prev.includes(weekNum) ? [] : [weekNum]); return; } // Toggle único o nada
      setSelectedWeeks(prev => prev.includes(weekNum) ? prev.filter(w => w !== weekNum) : [...prev, weekNum]);
  }

  const formatSchedule = (s) => {
      const timePart = `de ${s.start_time?.substring(0,5)} a ${s.end_time?.substring(0,5)}`;
      if (s.is_recurrent) {
        const dayName = weekDays.find(d => d.id === s.day_of_week)?.name;
        const weekPart = s.week_number ? `(Semana ${s.week_number}ª)` : "(Todas)";
        return `RECURRENTE: ${dayName} ${weekPart} ${timePart}`;
      } else { return `PUNTUAL: ${s.specific_date} ${timePart}`; }
  };

  if (loading) return <p>Cargando gestión de horarios...</p>;
  const canManageAll = ['admin', 'gestor'].includes(profile.role);

  return (
    <div className="schedule-manager">
      <form onSubmit={handleSaveSchedule} className="service-form" style={editingScheduleId ? {border:'2px solid #2e7d32', padding:15, borderRadius:8} : {}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
            <h3>{editingScheduleId ? 'Editar Horario' : 'Crear Nuevo Horario'}</h3>
            {editingScheduleId && <button type="button" onClick={handleCancelEdit} style={{background:'none', border:'none', color:'#d32f2f', cursor:'pointer', fontWeight:'bold'}}>Cancelar ✕</button>}
        </div>

        <div className="form-grid">
          {/* Farmacia */}
          {canManageAll && (
              <div><label>Farmacia</label><select value={selectedPharmacyId} onChange={e => setSelectedPharmacyId(e.target.value)} disabled={editingScheduleId} required>{pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          )}

          {/* Servicio */}
          <div>
            <label>Servicio</label>
            <select value={serviceId || ''} onChange={e => setServiceId(e.target.value)} disabled={(!selectedPharmacyId && canManageAll) || editingScheduleId} required>
              <option value="" disabled>{!selectedPharmacyId && canManageAll ? '-- Selecciona Farmacia --' : '-- Selecciona Servicio --'}</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <div><label>Tipo Horario</label><select value={scheduleType} onChange={e => setScheduleType(e.target.value)}><option value="recurrent">Recurrente</option><option value="punctual">Puntual</option></select></div>

          {scheduleType === 'recurrent' ? (
            <>
                <div className="day-selector">
                  <label>Días Semana {editingScheduleId && <small>(Selecciona uno)</small>}</label>
                  <div className="checkbox-group">
                      {weekDays.map(day => ( <label key={day.id}><input type="checkbox" value={day.id} checked={selectedDays.includes(day.id)} onChange={() => handleDayChange(day.id)} /> {day.name.substring(0,3)} </label> ))}
                  </div>
                </div>
                <div className="day-selector">
                  <label>Repetición Mensual {editingScheduleId && <small>(Selecciona una o ninguna)</small>}</label>
                  <div className="checkbox-group">
                      {monthWeeks.map(week => ( <label key={week}><input type="checkbox" value={week} checked={selectedWeeks.includes(week)} onChange={() => handleWeekChange(week)} /> {week}ª Semana</label> ))}
                  </div>
                </div>
            </>
          ) : (
            <div><label>Fecha Específica</label><input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} required={scheduleType === 'punctual'} /></div>
          )}

          <div><label>Hora Inicio</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required/></div>
          <div><label>Hora Fin</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required/></div>

          <button type="submit" className="button" disabled={!serviceId || actionLoading || loading}>
              {actionLoading ? 'Guardando...' : (editingScheduleId ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </form>

      <hr />
      <h3>Horarios Existentes</h3>
      <table className="service-table">
        <thead><tr><th>Servicio</th><th>Definición</th><th>Acciones</th></tr></thead>
        <tbody>
          {schedules.length === 0 ? (<tr><td colSpan="3">No hay horarios.</td></tr>) : (
            schedules.map(s => (
              <tr key={s.id} style={editingScheduleId===s.id ? {backgroundColor:'#e8f5e9'} : {}}>
                <td>{s.services?.name}</td>
                <td>{formatSchedule(s)}</td>
                <td className="actions-cell">
                    <button className="button-secondary" onClick={() => handleEditClick(s)} disabled={actionLoading || editingScheduleId}>Editar</button>
                    <button className="button-delete" onClick={() => handleDeleteSchedule(s.id)} disabled={actionLoading || editingScheduleId}>Borrar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}