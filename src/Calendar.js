import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import AppointmentModal from './AppointmentModal'
import Papa from 'papaparse'

// --- Helper Function: formatTime ---
const formatTime = (timeStr, includeSeconds = false) => {
   if (!timeStr) return "";
   try {
     let dateObj;
     if (timeStr.includes('T') && timeStr.includes('Z')) { dateObj = new Date(timeStr); }
     else if (timeStr.includes(':')) {
       const parts = timeStr.split(':'); dateObj = new Date();
       dateObj.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), parts[2] ? parseInt(parts[2], 10) : 0, 0);
     } else { return "Invalid Time"; }
     const options = { hour: '2-digit', minute: '2-digit', hour12: false };
     if (includeSeconds) options.second = '2-digit';
     return dateObj.toLocaleTimeString('en-GB', options);
   } catch (e) { console.error("Error formatTime:", e); return "Format Error"; }
};

// --- Helper Function: Asignar Color por Servicio ---
const serviceColorCache = {};
const baseColors = ['#3788d8', '#e06c75', '#98c379', '#d19a66', '#61afef', '#c678dd', '#56b6c2'];
const getServiceColor = (serviceId) => {
  if (!serviceId) return '#777777';
  if (serviceColorCache[serviceId]) return serviceColorCache[serviceId];
  const colorIndex = parseInt(serviceId || 0, 10) % baseColors.length;
  const color = baseColors[colorIndex];
  serviceColorCache[serviceId] = color;
  return color;
};

// --- Helper: Calcular fechas para recurrencia mensual ---
const expandMonthlyRecurrence = (schedule) => {
    const events = [];
    const targetWeek = schedule.week_number; 
    const targetDay = schedule.day_of_week;

    const now = new Date();
    const startCalc = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endCalc = new Date(now.getFullYear(), now.getMonth() + 4, 1);

    for (let d = new Date(startCalc); d <= endCalc; d.setMonth(d.getMonth() + 1)) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const dayOfWeek = firstDayOfMonth.getDay(); 
        let offset = (targetDay - dayOfWeek + 7) % 7;
        const firstOccurrenceDay = 1 + offset;
        const targetDateDay = firstOccurrenceDay + (targetWeek - 1) * 7;
        const targetDate = new Date(year, month, targetDateDay);
        
        if (targetDate.getMonth() === month) {
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dy = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dy}`;
            events.push({
                start: `${dateStr}T${schedule.start_time}`,
                end: `${dateStr}T${schedule.end_time}`
            });
        }
    }
    return events;
};

export default function Calendar({ profile, activeEmployeeId }) {
  const [appointments, setAppointments] = useState([]) 
  const [services, setServices] = useState([])
  const [employees, setEmployees] = useState([])
  const [schedules, setSchedules] = useState([]) 
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [preSelectedServiceId, setPreSelectedServiceId] = useState(null)

  const [filterEmployeeId, setFilterEmployeeId] = useState('all')
  const [filterServiceId, setFilterServiceId] = useState('all')
  const [filterPharmacyId, setFilterPharmacyId] = useState('') 

  const [formattedEvents, setFormattedEvents] = useState([]) 

  useEffect(() => { loadInitialData() }, [profile]);
  
  useEffect(() => {
    if (!loading && Array.isArray(appointments) && Array.isArray(schedules)) {
      filterAndFormatEvents(); 
    } else if (!loading) {
      setFormattedEvents([]); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, schedules, filterEmployeeId, filterServiceId, filterPharmacyId, loading]); 

  async function loadInitialData() {
     setLoading(true);
     console.log("Debug Calendar: loadInitialData...");
     let pharmacyId = profile.pharmacy_id;
     let appointmentsQuery = supabase.from('appointments').select('*, services(id, name), profiles!left(id, full_name)');
     let servicesQuery = supabase.from('services').select('*');
     let employeesQuery = supabase.from('profiles').select('id, full_name, role');
     let scheduleQuery = supabase.from('service_schedule').select('*, services!inner(id, name, pharmacy_id)'); 
     let pharmaciesQuery = supabase.from('pharmacies').select('id, name');

     if (profile.role !== 'admin') {
       if (pharmacyId) {
           appointmentsQuery = appointmentsQuery.eq('pharmacy_id', pharmacyId);
           servicesQuery = servicesQuery.eq('pharmacy_id', pharmacyId);
           employeesQuery = employeesQuery.eq('pharmacy_id', pharmacyId);
           scheduleQuery = scheduleQuery.eq('services.pharmacy_id', pharmacyId);
           setFilterPharmacyId(pharmacyId.toString());
       }
     }

     try {
         const [appRes, servRes, empRes, schRes, pharmRes] = await Promise.all([
           appointmentsQuery, servicesQuery, employeesQuery, scheduleQuery, pharmaciesQuery
         ]);

         if (appRes.error) throw appRes.error;

         setAppointments(appRes.data || []);
         setServices(servRes.data || []);
         setEmployees((empRes.data || []).filter(e => ['admin', 'gestor', 'gerente', 'empleado'].includes(e.role)));
         setSchedules(schRes.data || []); 
         setPharmacies(pharmRes.data || []);

         if (profile.role === 'admin' && pharmRes.data.length > 0 && !filterPharmacyId) {
             setFilterPharmacyId(pharmRes.data[0].id.toString());
         }
     } catch (error) {
         console.error("Error loading calendar data:", error);
         setAppointments([]); setServices([]); setEmployees([]); setSchedules([]); setPharmacies([]); 
     } finally {
         setLoading(false);
     }
  }

  async function loadAppointmentsOnly() {
     console.log("Debug Calendar: loadAppointmentsOnly...");
     let query = supabase.from('appointments').select('*, services(id, name), profiles!left(id, full_name)');
     if (profile.role !== 'admin' && profile.pharmacy_id) { query = query.eq('pharmacy_id', profile.pharmacy_id); }
     const { data, error } = await query;
     if (!error) setAppointments(data || []);
  }

  function filterAndFormatEvents() {
    const targetPharmacyId = filterPharmacyId ? filterPharmacyId.toString() : null;

    // 1. Citas
    const appEvents = appointments.filter(app => {
      if (targetPharmacyId && app.pharmacy_id?.toString() !== targetPharmacyId) return false;
      const employeeMatch = (filterEmployeeId === 'all' || app.created_by_user_id === filterEmployeeId);
      const serviceMatch = (filterServiceId === 'all' || app.service_id?.toString() === filterServiceId);
      const statusIsValid = (app.status === 'confirmada' || app.status === 'reserva');
      return employeeMatch && serviceMatch && statusIsValid;
    })
    .map((app) => {
        const isReserva = app.status === 'reserva';
        const color = getServiceColor(app.service_id);
        return {
          id: app.id,
          title: `${isReserva ? '[R] ' : ''}${app.client_name || 'Sin Nombre'}`, 
          date: app.appointment_time,
          extendedProps: { ...app, eventType: 'appointment' },
          className: isReserva ? 'event-reserva' : 'event-confirmada', 
          backgroundColor: color,
          borderColor: isReserva ? '#fd7e14' : '#0d6efd', 
          textColor: '#ffffff',
          display: 'block', 
        };
      });

    // 2. Horarios
    const scheduleEvents = [];
    
    const filteredSchedules = schedules.filter(sch => {
        const service = services.find(s => s.id === sch.service_id);
        if (targetPharmacyId && service?.pharmacy_id?.toString() !== targetPharmacyId) return false;
        return (filterServiceId === 'all' || sch.service_id?.toString() === filterServiceId);
    });

    filteredSchedules.forEach(sch => {
        const serviceName = sch.services?.name || `ID ${sch.service_id}`;
        const color = getServiceColor(sch.service_id);

        const baseEvent = {
            id: `sch_${sch.id}`,
            title: `🕒 ${serviceName}`, 
            backgroundColor: color, 
            className: 'event-background-schedule', 
            textColor: '#333333', 
            allDay: false,
            editable: false, 
            extendedProps: { ...sch, eventType: 'schedule', service_id: sch.service_id }, 
        };

        if (sch.is_recurrent) {
            if (sch.week_number) {
                const instances = expandMonthlyRecurrence(sch);
                instances.forEach((inst, idx) => {
                    scheduleEvents.push({
                        ...baseEvent,
                        id: `sch_${sch.id}_${idx}`,
                        start: inst.start,
                        end: inst.end
                    });
                });
            } else {
                scheduleEvents.push({
                    ...baseEvent,
                    id: `sch_${sch.id}`,
                    daysOfWeek: [ sch.day_of_week ], startTime: sch.start_time, endTime: sch.end_time 
                });
            }
        } else {
            scheduleEvents.push({
                ...baseEvent,
                id: `sch_${sch.id}`,
                start: `${sch.specific_date}T${sch.start_time}`, end: `${sch.specific_date}T${sch.end_time}`
            });
        }
    });

    setFormattedEvents([...scheduleEvents, ...appEvents]); 
  };

  // --- Renderizado Personalizado ---
  const renderEventContent = (eventInfo) => {
      const { event } = eventInfo;
      const isSchedule = event.extendedProps.eventType === 'schedule';
      
      const style = {
          padding: '1px 4px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          fontSize: isSchedule ? '0.85em' : '0.9em',
          fontWeight: isSchedule ? 'normal' : 'bold',
          color: isSchedule ? '#333' : '#fff',
          backgroundColor: event.backgroundColor,
          opacity: isSchedule ? 0.5 : 1,
          border: isSchedule ? `1px dashed #666` : 'none',
          borderLeft: !isSchedule ? (event.extendedProps.eventType === 'appointment' && event.title.startsWith('[R]') ? '5px solid #fd7e14' : '5px solid #0d6efd') : 'none',
          cursor: 'pointer',
      };

      return (
          <div style={style}>
              {!isSchedule && eventInfo.timeText && <span style={{marginRight:4}}>{eventInfo.timeText}</span>}
              <span>{event.title}</span>
          </div>
      );
  };

  // --- Manejador para Cambio de Farmacia ---
  const handlePharmacyChange = (e) => {
      setFilterPharmacyId(e.target.value);
      setFilterServiceId('all'); 
  }

  const handleDateClick = (arg) => { 
      if (!filterPharmacyId) { alert("Selecciona una farmacia."); return; }
      setModalMode('create'); setSelectedDate(arg.dateStr); setSelectedAppointment(null); setPreSelectedServiceId(null); setIsModalOpen(true); 
  };
  
  const handleEventClick = (arg) => {
      const type = arg.event.extendedProps.eventType;
      if (type === 'appointment') {
          setModalMode('edit'); setSelectedAppointment(arg.event.extendedProps); setSelectedDate(null); setPreSelectedServiceId(null); setIsModalOpen(true);
      } else if (type === 'schedule') {
          if (arg.event.start) {
              const d = arg.event.start;
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const dateStr = `${y}-${m}-${day}`;
              
              setModalMode('create'); setSelectedDate(dateStr); setSelectedAppointment(null); 
              setPreSelectedServiceId(arg.event.extendedProps.service_id);
              setIsModalOpen(true);
          }
      }
  };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedDate(null); setSelectedAppointment(null); setPreSelectedServiceId(null); };

  const handleCreateAppointment = async (formData) => {
      try {
          const appointmentTime = new Date(`${selectedDate}T${formData.time}`).toISOString();
          const creatorId = activeEmployeeId || profile.id;
          const { error } = await supabase.from('appointments').insert({
              client_name: formData.clientName, client_phone: formData.clientPhone, tarjeta_trebol: formData.tarjetaTrebol,
              appointment_time: appointmentTime, service_id: formData.serviceId, pharmacy_id: filterPharmacyId, 
              reminder_sent: formData.reminderSent, attended: formData.attended, amount: formData.amount,
              status: formData.isReserve ? 'reserva' : 'confirmada', is_new_client: formData.isNewClient,
              observations: formData.observations, created_by_user_id: creatorId
          });
          if (error) throw error;
          alert(formData.isReserve ? '¡Reserva guardada!' : '¡Cita guardada!');
          handleCloseModal(); loadAppointmentsOnly();
      } catch(error) { alert('Error: ' + error.message); }
  };
  const handleUpdateAppointment = async (formData) => {
      if (!selectedAppointment?.id) return;
      const originalDate = selectedAppointment.appointment_time.substring(0, 10);
      let newAppointmentTime = selectedAppointment.appointment_time;
      if (formData.time && formData.time !== formatTime(selectedAppointment.appointment_time, true)) {
         try { newAppointmentTime = new Date(`${originalDate}T${formData.time}`).toISOString(); } catch(e) { return; }
      }
      const updatePayload = {
        client_name: formData.clientName, client_phone: formData.clientPhone, tarjeta_trebol: formData.tarjetaTrebol,
        reminder_sent: formData.reminderSent, attended: formData.attended, amount: formData.amount,
        appointment_time: newAppointmentTime, status: formData.isReserve ? 'reserva' : 'confirmada',
        is_new_client: formData.isNewClient, observations: formData.observations
      };
      const { error } = await supabase.from('appointments').update(updatePayload).eq('id', selectedAppointment.id);
      if (error) { alert('Error: ' + error.message); } else { alert('¡Cita actualizada!'); handleCloseModal(); loadAppointmentsOnly(); }
  };
  const handleDeleteAppointment = async () => { 
     if (!window.confirm("¿Borrar cita?")) return;
     const { error } = await supabase.from('appointments').delete().eq('id', selectedAppointment.id);
     if (error) { alert('Error: ' + error.message); } else { alert('¡Cita borrada!'); handleCloseModal(); loadAppointmentsOnly(); }
  };

  // --- EXPORT CORREGIDO: Usa filterPharmacyId ---
  const handleExportCalendarView = () => {
       const appointmentsToExport = appointments.filter(app => {
           // AÑADIDO: Filtro de farmacia
           if (filterPharmacyId && app.pharmacy_id?.toString() !== filterPharmacyId.toString()) return false;
           
           const employeeMatch = (filterEmployeeId === 'all' || app.created_by_user_id === filterEmployeeId);
           const serviceMatch = (filterServiceId === 'all' || app.service_id?.toString() === filterServiceId);
           return employeeMatch && serviceMatch; 
       });
       
       if (appointmentsToExport.length === 0) { alert("No hay citas para exportar con los filtros actuales."); return; }
       
       try {
           const csvData = appointmentsToExport.map(app => {
              const serviceName = app.services?.name || 'Desconocido';
              const creatorName = app.profiles?.full_name || 'Desconocido';
              // const pharmacyName = ... (si lo tuvieras en el join, aquí podrías ponerlo)
              const hora = app.appointment_time ? new Date(app.appointment_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit'}) : 'N/A';
              return {
                  ID_Cita: String(app.id ?? ''), Fecha: app.appointment_time ? new Date(app.appointment_time).toLocaleDateString('es-ES') : 'N/A',
                  Hora: hora, Estado: String(app.status || ''), Cliente: String(app.client_name || ''),
                  Telefono: String(app.client_phone || ''), Tarjeta_Trebol: String(app.tarjeta_trebol || ''),
                  Servicio: serviceName, Observaciones: app.observations || '', 
                  Recordatorio_Enviado: app.reminder_sent ? 'Sí' : 'No', Ha_Acudido: app.attended ? 'Sí' : 'No',
                  Importe: app.amount ?? '', Creado_Por: creatorName, Nuevo_Cliente: app.is_new_client ? 'Sí' : 'No'
              };
           });
           const csv = Papa.unparse(csvData, { delimiter: ";", header: true });
           const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
           const url = URL.createObjectURL(blob);
           const link = document.createElement('a'); link.href = url;
           link.download = `calendario_${new Date().toISOString().split('T')[0]}.csv`;
           document.body.appendChild(link); link.click(); document.body.removeChild(link);
           URL.revokeObjectURL(url);
       } catch (error) { alert(`Error: ${error.message}.`); }
   }

  const legendServices = services.filter(s => 
      (!filterPharmacyId || s.pharmacy_id.toString() === filterPharmacyId.toString()) &&
      (filterServiceId === 'all' || s.id.toString() === filterServiceId)
  ).sort((a,b) => a.name.localeCompare(b.name));


  if (loading) return <div className="calendar-container"><p>Cargando...</p></div>;

  return (
    <div className="calendar-container">
      <div className="calendar-filters">
        {(profile.role === 'admin' || profile.role === 'gestor') && (
            <div className="filter-group">
                <label>Farmacia:</label>
                <select value={filterPharmacyId} onChange={handlePharmacyChange}>
                    {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        )}
        <div className="filter-group"><label>Empleado:</label><select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)}><option value="all">Todos</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
        <div className="filter-group"><label>Servicio:</label><select value={filterServiceId} onChange={(e) => setFilterServiceId(e.target.value)}><option value="all">Todos</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <button className="button button-small" onClick={handleExportCalendarView}>Descargar Vista (CSV)</button>
      </div>

      <div className="calendar-wrapper">
          <div className="calendar-main">
              <FullCalendar
                key={formattedEvents.length + filterEmployeeId + filterServiceId + filterPharmacyId}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,dayGridDay' }}
                events={formattedEvents}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                editable={false} selectable={true} locale="es" firstDay={1} buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }} timeZone="local"
                eventOrder="start" 
              />
          </div>
          <div className="calendar-legend">
              <h3 className="legend-title">Leyenda</h3>
              {legendServices.length === 0 ? <p>Sin servicios</p> : legendServices.map(s => (
                 <div key={s.id} className="legend-item">
                     <div className="legend-color-box" style={{backgroundColor: getServiceColor(s.id)}}></div>
                     <span>{s.name}</span>
                 </div>
              ))}
          </div>
      </div>

      {isModalOpen && (
        <AppointmentModal
          profile={profile} services={Array.isArray(services) ? services : []} onClose={handleCloseModal}
          mode={modalMode} date={modalMode === 'create' ? selectedDate : null} existingAppointment={modalMode === 'edit' ? selectedAppointment : null}
          onSave={handleCreateAppointment} onUpdate={handleUpdateAppointment} onDelete={handleDeleteAppointment}
          selectedPharmacyId={filterPharmacyId} preSelectedServiceId={preSelectedServiceId}
        />
      )}
    </div>
  )
}