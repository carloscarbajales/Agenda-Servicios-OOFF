import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AppointmentModal from './AppointmentModal'

// --- Helpers ---
const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';

// Helper para calcular días disponibles basado en la recurrencia
const expandMonthlyRecurrence = (schedule, targetMonth, targetYear) => {
    const events = [];
    const targetWeek = schedule.week_number;
    const targetDay = schedule.day_of_week;
    
    // Calcular solo para el mes seleccionado
    const d = new Date(targetYear, targetMonth, 1);
    
    while (d.getMonth() === targetMonth) {
        if (d.getDay() === targetDay) {
            let isMatch = false;
            // Verificar semana si aplica
            if (!targetWeek) {
                isMatch = true;
            } else {
                const day = d.getDate();
                const weekNum = Math.ceil(day / 7);
                if (weekNum === targetWeek) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                // Construimos fecha local YYYY-MM-DD
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                events.push(`${y}-${m}-${dayStr}`);
            }
        }
        d.setDate(d.getDate() + 1);
    }
    return events;
};

export default function AgendaTable({ profile, activeEmployeeId }) {
  const [loading, setLoading] = useState(false);
  
  // Datos Maestros
  const [services, setServices] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  // Filtros
  const [filterPharmacyId, setFilterPharmacyId] = useState('');
  const [filterServiceId, setFilterServiceId] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth()); // 0-11
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterDate, setFilterDate] = useState(''); // Fecha específica seleccionada

  // Datos de la Tabla
  const [daySlots, setDaySlots] = useState([]); // Los huecos generados
  const [dayAppointments, setDayAppointments] = useState([]); // Las citas reales
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSlotTime, setSelectedSlotTime] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => { loadMasterData() }, [profile]);

  // Si cambia la farmacia, reseteamos servicio
  useEffect(() => { setFilterServiceId(''); setFilterDate(''); }, [filterPharmacyId]);
  
  // Si cambia servicio o mes, recalculamos fechas disponibles (limpiamos selección)
  useEffect(() => { setFilterDate(''); }, [filterServiceId, filterMonth, filterYear]);

  // Si cambia la fecha concreta, cargamos la agenda
  useEffect(() => {
      if (filterDate && filterServiceId) loadAgendaForDay();
  }, [filterDate, filterServiceId]);

  async function loadMasterData() {
      setLoading(true);
      // 1. Cargar Farmacias (si aplica)
      if (['admin','gestor'].includes(profile.role)) {
          const { data } = await supabase.from('pharmacies').select('*');
          setPharmacies(data || []);
      } else {
          setFilterPharmacyId(profile.pharmacy_id?.toString());
      }

      // 2. Cargar Servicios (y sus horarios para calcular fechas)
      let servQuery = supabase.from('services').select('*, service_schedule(*)');
      if (profile.role !== 'admin' && profile.role !== 'gestor') {
          servQuery = servQuery.eq('pharmacy_id', profile.pharmacy_id);
      }
      const { data: servData } = await servQuery;
      setServices(servData || []);
      
      setLoading(false);
  }

  // --- Calcular Fechas Disponibles para el Selector ---
  const getAvailableDates = () => {
      if (!filterServiceId) return [];
      const service = services.find(s => s.id.toString() === filterServiceId);
      if (!service || !service.service_schedule) return [];

      let dates = [];
      service.service_schedule.forEach(sch => {
          if (sch.is_recurrent) {
              const recurringDates = expandMonthlyRecurrence(sch, parseInt(filterMonth), parseInt(filterYear));
              dates = [...dates, ...recurringDates];
          } else {
              // Puntual: verificar si cae en el mes/año seleccionado
              const d = new Date(sch.specific_date);
              if (d.getMonth() === parseInt(filterMonth) && d.getFullYear() === parseInt(filterYear)) {
                  // Usamos la fecha tal cual viene de la BD (YYYY-MM-DD)
                  dates.push(sch.specific_date);
              }
          }
      });
      // Ordenar y únicos
      return [...new Set(dates)].sort();
  };

  // --- Cargar Agenda (Huecos + Citas) ---
  async function loadAgendaForDay() {
      setLoading(true);
      
      // 1. Obtener los huecos teóricos (RPC)
      const { data: slots, error: rpcError } = await supabase.rpc('fn_get_all_slots_status', {
          p_service_id: parseInt(filterServiceId),
          p_date: filterDate,
          p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          p_exclude_appointment_id: null 
      });
      
      // 2. Obtener las citas reales con datos de cliente
      const { data: apps, error: appError } = await supabase
          .from('appointments')
          .select('*, profiles(full_name)') 
          .eq('service_id', filterServiceId)
          .gte('appointment_time', `${filterDate}T00:00:00`)
          .lte('appointment_time', `${filterDate}T23:59:59`);

      if (rpcError) {
          console.error("Error RPC:", rpcError);
          alert(`Error al generar huecos: ${rpcError.message}`);
      } else if (appError) {
          console.error("Error Citas:", appError);
          alert(`Error al cargar citas: ${appError.message}`);
      } else {
          setDaySlots(slots || []);
          setDayAppointments(apps || []);
      }
      setLoading(false);
  }

  // --- Handlers Modal ---
  const handleSlotClick = (slotTime, existingApp) => {
      if (existingApp) {
          setModalMode('edit');
          setSelectedAppointment(existingApp);
          setSelectedSlotTime(null);
      } else {
          setModalMode('create');
          setSelectedAppointment(null);
          setSelectedSlotTime(slotTime); // Pasamos la hora del hueco
      }
      setIsModalOpen(true);
  }

  const handleCloseModal = () => { setIsModalOpen(false); };
  
  // Reutilizamos lógica de guardado
  const handleSave = async (formData) => {
     const appointmentTime = new Date(`${filterDate}T${formData.time}`).toISOString();
     const creatorId = activeEmployeeId || profile.id;
     
     // --- CORRECCIÓN: Validar IDs numéricos antes de guardar ---
     const finalPharmacyId = filterPharmacyId 
        ? parseInt(filterPharmacyId, 10) 
        : (profile.pharmacy_id || formData.pharmacyId);

     const finalServiceId = filterServiceId 
        ? parseInt(filterServiceId, 10) 
        : formData.serviceId;

     if (!finalPharmacyId) {
         alert("Error: No se ha identificado la farmacia. Por favor selecciona una en el filtro.");
         return;
     }

     const payload = {
          client_name: formData.clientName, client_phone: formData.clientPhone, tarjeta_trebol: formData.tarjetaTrebol,
          appointment_time: appointmentTime, 
          service_id: finalServiceId, 
          pharmacy_id: finalPharmacyId, // <-- ID validado
          reminder_sent: formData.reminderSent, attended: formData.attended, amount: formData.amount,
          status: formData.isReserve ? 'reserva' : 'confirmada', is_new_client: formData.isNewClient,
          observations: formData.observations, created_by_user_id: creatorId
     };

     let error = null;
     if (modalMode === 'create') {
         const res = await supabase.from('appointments').insert(payload);
         error = res.error;
     } else {
         const res = await supabase.from('appointments').update(payload).eq('id', selectedAppointment.id);
         error = res.error;
     }
     
     if (error) {
         console.error("Error guardando cita:", error);
         alert("Error al guardar: " + error.message);
     } else {
         setIsModalOpen(false);
         loadAgendaForDay(); // Recargar tabla
     }
  }
  
  const handleDelete = async () => {
      if(!window.confirm("¿Borrar cita?")) return;
      const { error } = await supabase.from('appointments').delete().eq('id', selectedAppointment.id);
      if (error) alert("Error al borrar: " + error.message);
      else {
          setIsModalOpen(false);
          loadAgendaForDay();
      }
  }


  // --- Render ---
  const visibleServices = services.filter(s => 
      !filterPharmacyId || s.pharmacy_id.toString() === filterPharmacyId
  );

  return (
    <div className="reports-container">
       <h1>Agenda por Servicio (Vista Tabla)</h1>
       
       {/* BARRA DE FILTROS */}
       <div className="report-controls" style={{backgroundColor: '#e3f2fd', border: '1px solid #90caf9'}}>
           {/* Farmacia (Admin/Gestor) */}
           {['admin','gestor'].includes(profile.role) && (
               <div className="filter-group">
                   <label>Farmacia</label>
                   <select value={filterPharmacyId} onChange={e=>setFilterPharmacyId(e.target.value)}>
                       <option value="">-- Selecciona --</option>
                       {pharmacies.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
               </div>
           )}

           {/* Servicio */}
           <div className="filter-group">
               <label>Servicio</label>
               <select value={filterServiceId} onChange={e=>setFilterServiceId(e.target.value)} disabled={!filterPharmacyId && ['admin','gestor'].includes(profile.role)}>
                   <option value="">-- Selecciona --</option>
                   {visibleServices.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
           </div>

           {/* Mes y Año */}
           <div className="filter-group">
               <label>Mes</label>
               <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
                   {Array.from({length:12}, (_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('es', {month:'long'})}</option>)}
               </select>
           </div>
           <div className="filter-group">
               <label>Año</label>
               <input type="number" value={filterYear} onChange={e=>setFilterYear(e.target.value)} style={{width:'80px'}}/>
           </div>

           {/* Selector de DÍA ESPECÍFICO (Calculado) */}
           <div className="filter-group">
               <label>Día (Disponible)</label>
               <select value={filterDate} onChange={e=>setFilterDate(e.target.value)} disabled={!filterServiceId} style={{minWidth:'150px', fontWeight:'bold', color: '#2e7d32'}}>
                   <option value="">-- Elige Día --</option>
                   {getAvailableDates().map(dateStr => (
                       <option key={dateStr} value={dateStr}>
                           {new Date(dateStr).toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month:'long'})}
                       </option>
                   ))}
               </select>
           </div>
       </div>

       {/* TABLA DE AGENDA */}
       {filterDate && filterServiceId && (
           <div className="report-card">
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', paddingBottom:10, marginBottom:10}}>
                    <h2 style={{margin:0, border:0}}>
                        {services.find(s=>s.id.toString()===filterServiceId)?.name} 
                        <span style={{fontWeight:'normal', fontSize:'0.8em', color:'#666', marginLeft:10}}>
                            {new Date(filterDate).toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
                        </span>
                    </h2>
                    <button className="button button-small" onClick={loadAgendaForDay}>🔄 Refrescar</button>
               </div>
               
               <div className="table-wrapper">
                   <table className="service-table" style={{borderCollapse:'separate', borderSpacing: '0 5px'}}>
                       <thead>
                           <tr>
                               <th style={{width:'80px'}}>Hora</th>
                               <th style={{width:'100px'}}>Estado</th>
                               <th>Cliente</th>
                               <th>Teléfono</th>
                               <th>Tarjeta</th>
                               <th style={{width:'150px'}}>Acción</th>
                           </tr>
                       </thead>
                       <tbody>
                           {daySlots.length === 0 ? (
                               <tr><td colSpan="6" style={{textAlign:'center', padding:20}}>No hay huecos generados para este día.</td></tr>
                           ) : (
                               daySlots.map(slot => {
                                   const app = dayAppointments.find(a => formatTime(new Date(a.appointment_time).toLocaleTimeString('en-GB')) === formatTime(slot.slot_time));
                                   const isOccupied = !!app;
                                   const isReserva = app?.status === 'reserva';

                                   return (
                                       <tr key={slot.slot_time} style={{backgroundColor: isOccupied ? (isReserva?'#fff3e0':'#e3f2fd') : 'white'}}>
                                           <td style={{fontWeight:'bold', fontSize:'1.1em'}}>{formatTime(slot.slot_time)}</td>
                                           <td>
                                               {isOccupied ? (
                                                   <span style={{
                                                       padding:'4px 8px', borderRadius:'4px', fontSize:'0.8em', fontWeight:'bold',
                                                       backgroundColor: isReserva ? '#fd7e14' : '#0d6efd', color:'white'
                                                   }}>
                                                       {isReserva ? 'RESERVA' : 'OCUPADO'}
                                                   </span>
                                               ) : (
                                                   <span style={{color:'#2e7d32'}}>Libre</span>
                                               )}
                                           </td>
                                           <td>{app?.client_name || '-'}</td>
                                           <td>{app?.client_phone || '-'}</td>
                                           <td>{app?.tarjeta_trebol || '-'}</td>
                                           <td>
                                               <button 
                                                   className={isOccupied ? "button-secondary" : "button"}
                                                   style={!isOccupied ? {padding:'4px 10px', fontSize:'0.85em'} : {}}
                                                   onClick={() => handleSlotClick(slot.slot_time, app)}
                                               >
                                                   {isOccupied ? 'Editar / Ver' : 'Reservar'}
                                               </button>
                                           </td>
                                       </tr>
                                   );
                               })
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
       )}
       
       {!filterDate && (
           <div style={{textAlign:'center', padding:40, color:'#999'}}>
               <h3>Selecciona una farmacia, un servicio y un día disponible para ver la agenda.</h3>
           </div>
       )}

       {/* Modal Reutilizado */}
       {isModalOpen && (
        <AppointmentModal
          profile={profile} 
          services={visibleServices} 
          onClose={handleCloseModal}
          mode={modalMode} 
          date={filterDate} 
          // CORRECCIÓN CLAVE: Inicializar el objeto 'existingAppointment' con el ID de la farmacia
          // para que el Modal sepa dónde guardar.
          existingAppointment={selectedAppointment ? selectedAppointment : { 
              appointment_time: `${filterDate}T${selectedSlotTime}`, 
              pharmacy_id: parseInt(filterPharmacyId), // <-- ¡AQUÍ ESTÁ LA SOLUCIÓN!
              service_id: parseInt(filterServiceId) 
          }}
          onSave={handleSave} 
          onUpdate={handleSave} 
          onDelete={handleDelete}
          
          selectedPharmacyId={filterPharmacyId}
        />
      )}
    </div>
  )
}